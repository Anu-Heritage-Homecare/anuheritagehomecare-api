import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Route Nest logs through pino so everything is structured and redacted.
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const appConfig = config.getOrThrow<AppConfig>('app');
  const isProduction = appConfig.nodeEnv === 'production';

  // Security headers (CSP, HSTS, no sniff, frameguard, and so on).
  app.use(helmet());
  // Response compression for bandwidth and latency.
  app.use(compression());

  // Explicit CORS allow list. Never reflect arbitrary origins in production.
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiDefaultVersion,
  });

  // Strict input validation: reject unknown properties, strip them, and coerce
  // payloads into typed DTO instances. This is a core defence against invalid
  // and malicious input.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      forbidUnknownValues: true,
    }),
  );

  // Flush in flight requests on SIGTERM/SIGINT for zero downtime deploys.
  app.enableShutdownHooks();

  // Publish OpenAPI docs outside production only.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Anu Heritage Homecare API')
      .setDescription('Enterprise homecare API built with DDD, PostgreSQL and Prisma.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appConfig.apiPrefix}/docs`, app, document);
  }

  await app.listen(appConfig.port);
}

void bootstrap();
