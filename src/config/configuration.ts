import { Env } from './env.validation';

/**
 * Typed configuration derived from validated environment variables. Consumed
 * through Nest's ConfigService so no part of the app reads process.env directly.
 */
export interface AppConfig {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly port: number;
  readonly apiPrefix: string;
  readonly apiDefaultVersion: string;
  readonly corsOrigins: string[];
  readonly throttle: {
    readonly ttlSeconds: number;
    readonly limit: number;
  };
  readonly logLevel: Env['LOG_LEVEL'];
}

export function buildConfig(env: Env): { app: AppConfig } {
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      apiDefaultVersion: env.API_DEFAULT_VERSION,
      corsOrigins: env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
      throttle: {
        ttlSeconds: env.THROTTLE_TTL_SECONDS,
        limit: env.THROTTLE_LIMIT,
      },
      logLevel: env.LOG_LEVEL,
    },
  };
}
