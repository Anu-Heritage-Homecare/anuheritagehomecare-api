import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { AppConfig } from '../src/config/configuration';

/**
 * Generates the OpenAPI (Swagger) document for the mobile app surface only, with
 * every admin back office route stripped out, and writes it to
 * `docs/openapi-mobile.json` for the frontend to consume ahead of a real deploy.
 *
 * It boots the application module to read the actual route metadata (the same way
 * `main.ts` builds the live docs), but never listens or connects: no server and no
 * database are touched. Environment values are loaded from `.env.example` so the
 * module validates and boots without a configured environment.
 */

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
