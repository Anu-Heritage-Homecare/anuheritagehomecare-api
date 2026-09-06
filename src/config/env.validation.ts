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
  // Public base URL of this API, used to build the absolute calendar feed link.
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),

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
  // Short lived token issued after a correct password when two factor is on; it
  // only authorises the second factor step, not the API.
  JWT_MFA_SECRET: z.string().min(32, 'JWT_MFA_SECRET must be at least 32 characters'),
  JWT_MFA_TTL: z.string().min(1).default('5m'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Two factor authentication (TOTP). The encryption key protects the stored TOTP
  // secret at rest; the issuer is the label shown in the authenticator app.
  TWO_FACTOR_ENCRYPTION_KEY: z
    .string()
    .min(32, 'TWO_FACTOR_ENCRYPTION_KEY must be at least 32 characters'),
  TWO_FACTOR_ISSUER: z.string().min(1).default('Anu Heritage Homecare'),

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

  // Bookable hours in a day (local), used to generate Flexible booking time
  // slots until real caregiver availability exists.
  BOOKING_DAY_START_HOUR: z.coerce.number().int().min(0).max(23).default(8),
  BOOKING_DAY_END_HOUR: z.coerce.number().int().min(1).max(24).default(21),

  // Arrival geofence: how close (in metres) a caregiver must be to a care
  // recipient's pinned address to clock in. Applied to every recipient for now.
  GEOFENCE_RADIUS_METERS: z.coerce.number().int().positive().max(5000).default(150),

  // Caregiver pay period. Periods are fixed length windows anchored to a
  // reference date; payday falls a number of days after a period ends. Applied to
  // every caregiver until per caregiver schedules exist.
  EARNINGS_PAY_PERIOD_DAYS: z.coerce.number().int().positive().max(31).default(14),
  EARNINGS_PAY_PERIOD_ANCHOR: z.coerce.date().default(new Date('2026-01-01T00:00:00.000Z')),
  EARNINGS_PAYDAY_OFFSET_DAYS: z.coerce.number().int().min(0).max(31).default(1),

  // Payment providers. Stripe serves USD, Paystack serves NGN. Keys are optional
  // so the service still boots without them; the adapters fail closed if a
  // provider is used before its key is configured.
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  PAYSTACK_SECRET_KEY: z.string().default(''),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(''),
  PAYMENT_CALLBACK_URL: z.string().default(''),
  // Nominal amount (in minor units) charged to save a reusable Paystack card,
  // since Paystack only returns a reusable authorization after a real charge.
  // The charge is refunded once the card is tokenised. Default 5000 (fifty naira).
  PAYSTACK_CARD_SETUP_AMOUNT_MINOR: z.coerce.number().int().positive().default(5000),

  // KYC. US owners verify through Stripe (reusing STRIPE_SECRET_KEY above);
  // Nigeria owners verify a NIN or passport through QoreID. Optional so the
  // service boots without them; the adapters fail closed if used unconfigured.
  QOREID_CLIENT_ID: z.string().default(''),
  QOREID_SECRET: z.string().default(''),
  QOREID_BASE_URL: z.string().default('https://api.qoreid.com'),
  // Signing secret for the Stripe Identity webhook endpoint (distinct from the
  // payments webhook endpoint secret).
  STRIPE_IDENTITY_WEBHOOK_SECRET: z.string().default(''),

  // Sales tax rate applied to billing, in basis points, per market. Defaults to
  // zero so no tax is added until the real rates are configured.
  BILLING_TAX_BPS_US: z.coerce.number().int().min(0).max(10000).default(0),
  BILLING_TAX_BPS_NG: z.coerce.number().int().min(0).max(10000).default(0),

  // Cloudinary photo storage for visit photos. Optional so the service boots
  // without them; the adapter fails closed for uploads if the secret is empty.
  // Signed upload happens client side with a server issued signature, so the api
  // secret never leaves the server.
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_FOLDER: z.string().default('anu/visits'),
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
