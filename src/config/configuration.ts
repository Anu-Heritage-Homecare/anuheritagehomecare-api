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

export interface AuthConfig {
  readonly accessSecret: string;
  readonly accessTtl: string;
  readonly refreshSecret: string;
  readonly refreshTtl: string;
  readonly resetSecret: string;
  readonly resetTtl: string;
  readonly bcryptSaltRounds: number;
}

export interface OtpConfig {
  readonly length: number;
  readonly ttlMinutes: number;
  readonly maxAttempts: number;
}

export interface MailConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly password: string;
  readonly from: string;
}

export function buildConfig(env: Env): {
  app: AppConfig;
  auth: AuthConfig;
  otp: OtpConfig;
  mail: MailConfig;
} {
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
    auth: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshTtl: env.JWT_REFRESH_TTL,
      resetSecret: env.JWT_RESET_SECRET,
      resetTtl: env.JWT_RESET_TTL,
      bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    },
    otp: {
      length: env.OTP_LENGTH,
      ttlMinutes: env.OTP_TTL_MINUTES,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    },
    mail: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.MAIL_FROM,
    },
  };
}
