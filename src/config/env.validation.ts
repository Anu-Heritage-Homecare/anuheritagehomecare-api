import { z } from 'zod';

/**
 * Fail fast on misconfiguration. The application refuses to boot unless every
 * required environment variable is present and well formed. This prevents a
 * partially configured service from starting in production.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  API_DEFAULT_VERSION: z.string().min(1).default('1'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a postgresql connection string',
    }),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Authentication. Secrets must be strong and distinct per token purpose.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_TTL: z.string().min(1).default('30d'),
  JWT_RESET_SECRET: z.string().min(32, 'JWT_RESET_SECRET must be at least 32 characters'),
  JWT_RESET_TTL: z.string().min(1).default('10m'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // One time passcodes for email verification and password reset.
  OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  // Outbound email over SMTP (nodemailer).
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().min(1).default('Anu Heritage Homecare <no-reply@anuheritagehomecare.com>'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
