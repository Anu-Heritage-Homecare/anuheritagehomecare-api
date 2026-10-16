import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { VersioningType, type Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { AppConfig } from '../src/config/configuration';

/**
 * Generates the OpenAPI (Swagger) document for the mobile app surface only, with
 * every admin back office route stripped out, and writes it to
 * `docs/openapi-mobile.json` for the frontend to consume ahead of a real deploy.
 *
 * It boots the COMPILED application module (from dist) to read the actual route
 * metadata, but never listens or connects: no server and no database are touched.
 * Environment values are loaded from `.env.example` so the module validates and
 * boots without a configured environment.
 *
 * It must load the built module, not the TypeScript source: the @nestjs/swagger
 * CLI plugin that infers DTO property types runs only during `nest build`, so
 * generating from source (ts-node) collapses untyped @ApiProperty() fields to
 * "object". Run `npm run build` first (the npm script does this).
 */

/** Load the compiled AppModule so the swagger plugin's injected type metadata is present. */
function loadBuiltAppModule(): Type<unknown> {
  const entry = join(__dirname, '..', 'dist', 'app.module.js');
  if (!existsSync(entry)) {
    throw new Error(
      'Build output not found at dist/. Run "npm run build" before generating the spec.',
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(entry) as { AppModule: Type<unknown> };
  return mod.AppModule;
}

/** Populate process.env from a dotenv style file for any key not already set. */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) {
    return;
  }
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** True when the path belongs to the admin back office surface. */
function isAdminPath(path: string): boolean {
  return /\/admin(\/|$)/.test(path);
}

async function generate(): Promise<void> {
  loadEnvFile(join(__dirname, '..', '.env.example'));
  // The mobile app never talks to production; keep the environment as development.
  process.env.NODE_ENV = 'development';

  const AppModule = loadBuiltAppModule();
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    const config = app.get(ConfigService);
    const appConfig = config.getOrThrow<AppConfig>('app');

    // Mirror main.ts so the documented paths match what the service actually serves.
    app.setGlobalPrefix(appConfig.apiPrefix);
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: appConfig.apiDefaultVersion,
    });

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Anu Heritage Homecare API (mobile)')
      .setDescription(
        'Mobile app surface (family owner and caregiver) of the Anu Heritage Homecare API. ' +
          'Admin back office routes are intentionally excluded from this document.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(appConfig.publicUrl)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const mobile = stripAdmin(document);
    addErrorEnvelope(mobile);

    const outDir = join(__dirname, '..', 'docs');
    mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, 'openapi-mobile.json');
    writeFileSync(outFile, `${JSON.stringify(mobile, null, 2)}\n`, 'utf8');

    const pathCount = Object.keys(mobile.paths).length;
    console.log(`Wrote ${pathCount} non-admin paths to ${outFile}`);
  } finally {
    await app.close();
  }
}

/** Drop every admin path and admin tag from the document, leaving the mobile surface. */
function stripAdmin(document: OpenAPIObject): OpenAPIObject {
  const paths: OpenAPIObject['paths'] = {};
  for (const [path, item] of Object.entries(document.paths)) {
    if (!isAdminPath(path)) {
      paths[path] = item;
    }
  }

  const tags = (document.tags ?? []).filter((tag) => !tag.name.startsWith('admin'));
  const allSchemas = document.components?.schemas ?? {};
  const schemas = reachableSchemas(paths, allSchemas);

  return { ...document, paths, tags, components: { ...document.components, schemas } };
}

type SchemaMap = NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>;

/** The shared error envelope every endpoint returns on failure. */
const ERROR_RESPONSE_SCHEMA = {
  type: 'object',
  description:
    'Standard error envelope. Domain errors also carry a stable "code"; framework ' +
    'errors (validation, rate limit) omit it. Known codes: INVALID_CREDENTIALS (401), ' +
    'EMAIL_NOT_VERIFIED (403), KYC_REQUIRED (403), FORBIDDEN (403), VALIDATION_ERROR (400), ' +
    'NOT_FOUND (404), CONFLICT (409), OUTSIDE_GEOFENCE (422).',
  properties: {
    statusCode: { type: 'integer', example: 401 },
    code: {
      type: 'string',
      nullable: true,
      description: 'Stable domain error code; absent for framework errors.',
      example: 'INVALID_CREDENTIALS',
    },
    message: { type: 'string', example: 'Invalid credentials' },
    path: { type: 'string', example: '/api/v1/auth/login' },
    timestamp: { type: 'string', format: 'date-time' },
  },
  required: ['statusCode', 'message', 'path', 'timestamp'],
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

/**
 * Document the shared error envelope as a reusable `ErrorResponse` schema and attach
 * it as the `default` (error) response on every operation, so the client knows the
 * exact failure body shape and the domain codes to branch on.
 */
function addErrorEnvelope(document: OpenAPIObject): void {
  const components = (document.components ??= {});
  const schemas = (components.schemas ??= {});
  schemas.ErrorResponse = ERROR_RESPONSE_SCHEMA;

  for (const item of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (operation === undefined) {
        continue;
      }
      operation.responses ??= {};
      operation.responses.default ??= {
        description: 'Error envelope: statusCode, optional domain code, message, path, timestamp.',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      };
    }
  }
}

const SCHEMA_REF = /"#\/components\/schemas\/([^"]+)"/g;

/** Collect the schema names referenced in a JSON serialisable value. */
function refsIn(value: unknown): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;
  const json = JSON.stringify(value) ?? '';
  while ((match = SCHEMA_REF.exec(json)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/**
 * The transitive closure of component schemas reachable from the kept paths, so
 * the document carries only the DTOs the mobile surface actually uses (admin only
 * schemas are dropped).
 */
function reachableSchemas(paths: OpenAPIObject['paths'], allSchemas: SchemaMap): SchemaMap {
  const kept: SchemaMap = {};
  const queue = refsIn(paths);
  while (queue.length > 0) {
    const name = queue.pop() as string;
    if (name in kept || !(name in allSchemas)) {
      continue;
    }
    const schema = allSchemas[name];
    kept[name] = schema;
    queue.push(...refsIn(schema));
  }
  return kept;
}

void generate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
