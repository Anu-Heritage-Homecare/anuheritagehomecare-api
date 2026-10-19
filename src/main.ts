import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { docsBasicAuth } from './shared/infrastructure/http/docs-basic-auth';

async function bootstrap(): Promise<void> {
  // rawBody is retained so payment webhook signatures can be verified against the
  // exact bytes the provider signed.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

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

  // Publish OpenAPI docs. Open in non production; in production only when basic auth
  // credentials are configured, and then behind that basic auth (fail closed).
  const hasDocsAuth = appConfig.swaggerUser !== '' && appConfig.swaggerPassword !== '';
  if (!isProduction || hasDocsAuth) {
    const docsPath = `${appConfig.apiPrefix}/docs`;
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Anu Heritage Homecare API')
      .setDescription('Enterprise homecare API built with DDD, PostgreSQL and Prisma.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    if (isProduction) {
      // Guard the docs UI, its assets and the raw json/yaml behind HTTP Basic auth.
      const guard = docsBasicAuth(appConfig.swaggerUser, appConfig.swaggerPassword);
      for (const path of [`/${docsPath}`, `/${docsPath}-json`, `/${docsPath}-yaml`]) {
        app.use(path, guard);
      }
    }

    SwaggerModule.setup(docsPath, app, document);
  }

  await app.listen(appConfig.port);
}

void bootstrap();
