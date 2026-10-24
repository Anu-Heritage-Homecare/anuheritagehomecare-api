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
  /** The public base URL of this API, used to build absolute links (calendar feed). */
  readonly publicUrl: string;
  readonly corsOrigins: string[];
  readonly throttle: {
    readonly ttlSeconds: number;
    readonly limit: number;
  };
  readonly logLevel: Env['LOG_LEVEL'];
  /** HTTP Basic auth for the OpenAPI docs in production (empty disables them). */
  readonly swaggerUser: string;
  readonly swaggerPassword: string;
}

export interface AuthConfig {
  readonly accessSecret: string;
  readonly accessTtl: string;
  readonly refreshSecret: string;
  readonly refreshTtl: string;
  readonly resetSecret: string;
  readonly resetTtl: string;
  readonly mfaSecret: string;
  readonly mfaTtl: string;
  readonly bcryptSaltRounds: number;
}

export interface AdminAuthConfig {
  readonly accessSecret: string;
  readonly accessTtl: string;
  readonly refreshSecret: string;
  readonly refreshTtl: string;
}

export interface TwoFactorConfig {
  readonly encryptionKey: string;
  readonly issuer: string;
}

export interface OtpConfig {
  readonly length: number;
  readonly ttlMinutes: number;
  readonly maxAttempts: number;
  /**
   * TEMPORARY: when true, OTP emails are not sent and every passcode is a fixed
   * string of zeros that verification accepts. Stopgap until SMTP is configured;
   * must be false with real users.
   */
  readonly bypassEnabled: boolean;
}

export interface MailConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly password: string;
  readonly from: string;
}

export interface BookingConfig {
  readonly dayStartHour: number;
  readonly dayEndHour: number;
}

export interface GeofenceConfig {
  readonly radiusMeters: number;
}

export interface EarningsConfig {
  readonly payPeriodDays: number;
  readonly payPeriodAnchor: Date;
  readonly paydayOffsetDays: number;
}

export interface PaymentConfig {
  readonly stripeSecretKey: string;
  readonly stripeWebhookSecret: string;
  readonly paystackSecretKey: string;
  readonly paystackWebhookSecret: string;
  readonly callbackUrl: string;
  readonly paystackCardSetupAmountMinor: number;
}

export interface KycConfig {
  readonly qoreIdClientId: string;
  readonly qoreIdSecret: string;
  readonly qoreIdBaseUrl: string;
  readonly stripeIdentityWebhookSecret: string;
}

export interface PhotoStorageConfig {
  readonly cloudName: string;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly folder: string;
}

export interface BillingConfig {
  /** Sales tax rate in basis points, keyed by ISO country code (for example US, NG). */
  readonly taxRateBpsByCountry: Record<string, number>;
}

export function buildConfig(env: Env): {
  app: AppConfig;
  auth: AuthConfig;
  adminAuth: AdminAuthConfig;
  twoFactor: TwoFactorConfig;
  otp: OtpConfig;
  mail: MailConfig;
  booking: BookingConfig;
  geofence: GeofenceConfig;
  earnings: EarningsConfig;
  payment: PaymentConfig;
  kyc: KycConfig;
  photoStorage: PhotoStorageConfig;
  billing: BillingConfig;
} {
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      apiDefaultVersion: env.API_DEFAULT_VERSION,
      publicUrl: env.APP_PUBLIC_URL,
      corsOrigins: env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
      throttle: {
        ttlSeconds: env.THROTTLE_TTL_SECONDS,
        limit: env.THROTTLE_LIMIT,
      },
      logLevel: env.LOG_LEVEL,
      swaggerUser: env.SWAGGER_USER,
      swaggerPassword: env.SWAGGER_PASSWORD,
    },
    auth: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshTtl: env.JWT_REFRESH_TTL,
      resetSecret: env.JWT_RESET_SECRET,
      resetTtl: env.JWT_RESET_TTL,
      mfaSecret: env.JWT_MFA_SECRET,
      mfaTtl: env.JWT_MFA_TTL,
      bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    },
    adminAuth: {
      accessSecret: env.JWT_ADMIN_ACCESS_SECRET,
      accessTtl: env.JWT_ADMIN_ACCESS_TTL,
      refreshSecret: env.JWT_ADMIN_REFRESH_SECRET,
      refreshTtl: env.JWT_ADMIN_REFRESH_TTL,
    },
    twoFactor: {
      encryptionKey: env.TWO_FACTOR_ENCRYPTION_KEY,
      issuer: env.TWO_FACTOR_ISSUER,
    },
    otp: {
      length: env.OTP_LENGTH,
      ttlMinutes: env.OTP_TTL_MINUTES,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      bypassEnabled: env.OTP_BYPASS_ENABLED,
    },
    mail: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.MAIL_FROM,
    },
    booking: {
      dayStartHour: env.BOOKING_DAY_START_HOUR,
      dayEndHour: env.BOOKING_DAY_END_HOUR,
    },
    geofence: {
      radiusMeters: env.GEOFENCE_RADIUS_METERS,
    },
    earnings: {
      payPeriodDays: env.EARNINGS_PAY_PERIOD_DAYS,
      payPeriodAnchor: env.EARNINGS_PAY_PERIOD_ANCHOR,
      paydayOffsetDays: env.EARNINGS_PAYDAY_OFFSET_DAYS,
    },
    payment: {
      stripeSecretKey: env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      paystackSecretKey: env.PAYSTACK_SECRET_KEY,
      paystackWebhookSecret: env.PAYSTACK_WEBHOOK_SECRET,
      callbackUrl: env.PAYMENT_CALLBACK_URL,
      paystackCardSetupAmountMinor: env.PAYSTACK_CARD_SETUP_AMOUNT_MINOR,
    },
    kyc: {
      qoreIdClientId: env.QOREID_CLIENT_ID,
      qoreIdSecret: env.QOREID_SECRET,
      qoreIdBaseUrl: env.QOREID_BASE_URL,
      stripeIdentityWebhookSecret: env.STRIPE_IDENTITY_WEBHOOK_SECRET,
    },
    photoStorage: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
      folder: env.CLOUDINARY_FOLDER,
    },
    billing: {
      taxRateBpsByCountry: {
        US: env.BILLING_TAX_BPS_US,
        NG: env.BILLING_TAX_BPS_NG,
      },
    },
  };
}
