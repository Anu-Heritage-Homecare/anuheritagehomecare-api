import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppConfig, buildConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AdminIdentityModule } from './modules/admin-identity/admin-identity.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CarePlansModule } from './modules/care-plans/care-plans.module';
import { CareRecipientsModule } from './modules/care-recipients/care-recipients.module';
import { BillingModule } from './modules/billing/billing.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CareRequestsModule } from './modules/care-requests/care-requests.module';
import { ClientsModule } from './modules/clients/clients.module';
import { EarningsModule } from './modules/earnings/earnings.module';
import { FamilyCareModule } from './modules/family-care/family-care.module';
import { FamilyDashboardModule } from './modules/family-dashboard/family-dashboard.module';
import { KycModule } from './modules/kyc/kyc.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { VisitsModule } from './modules/visits/visits.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AllExceptionsFilter } from './shared/infrastructure/http/all-exceptions.filter';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    // Validated, typed configuration. Fails fast on invalid environment.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [() => buildConfig(validateEnv(process.env))],
    }),

    // Structured JSON logging with sensitive fields redacted.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const app = config.getOrThrow<AppConfig>('app');
        return {
          pinoHttp: {
            level: app.logLevel,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token',
                'req.body.newPassword',
                'req.body.currentPassword',
                'req.body.code',
                'req.body.otp',
                'req.body.refreshToken',
                'req.body.resetToken',
                'req.body.challengeToken',
                // Care recipient health and medication data is sensitive personal
                // data and must never reach the logs.
                'req.body.medicalConditions',
                'req.body.allergies',
                'req.body.medications',
                'req.body.fullAddress',
                // KYC identity documents, selfies and dates of birth are sensitive.
                'req.body.idNumber',
                'req.body.faceImage',
                'req.body.dateOfBirth',
                // Caregiver location telemetry is sensitive; keep the coordinate
                // batch and any clock in position out of the logs.
                'req.body.points',
                'req.body.latitude',
                'req.body.longitude',
                // Visit notes and medication notes are free text about the
                // recipient (health data), so keep them out of the logs.
                'req.body.text',
                'req.body.note',
                // Caregiver observations are health related free text.
                'req.body.mood',
                'req.body.appetite',
                'req.body.mobility',
                'req.body.medicationStatus',
                // An additional care request reason may mention the recipient's health.
                'req.body.reason',
              ],
              remove: true,
            },
            transport:
              app.nodeEnv === 'development'
                ? { target: 'pino-pretty', options: { singleLine: true } }
                : undefined,
          },
        };
      },
    }),

    // Global rate limiting to blunt brute force and abuse.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const app = config.getOrThrow<AppConfig>('app');
        return {
          throttlers: [{ ttl: app.throttle.ttlSeconds * 1000, limit: app.throttle.limit }],
        };
      },
    }),

    PrismaModule,
    SharedModule,

    HealthModule,
    ClientsModule,
    IdentityModule,
    CareRecipientsModule,
    CarePlansModule,
    BookingsModule,
    KycModule,
    PaymentsModule,
    VisitsModule,
    TrackingModule,
    EarningsModule,
    AvailabilityModule,
    FamilyDashboardModule,
    FamilyCareModule,
    CareRequestsModule,
    BillingModule,
    ProfileModule,
    AdminIdentityModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Order matters: the catch all is registered first so the domain specific
    // filter (registered later) takes precedence for domain exceptions.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
