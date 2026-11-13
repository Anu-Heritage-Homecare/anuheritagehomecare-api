import { Injectable } from '@nestjs/common';
import {
  MfaEnforcement as PrismaEnforcement,
  MfaMethod as PrismaMethod,
  SecuritySettings as PrismaSecuritySettings,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { MfaEnforcement } from '../../domain/mfa-enforcement.enum';
import { MfaMethod } from '../../domain/mfa-method.enum';
import { SecuritySettings } from '../../domain/security-settings.entity';
import {
  SECURITY_SETTINGS_ID,
  SecuritySettingsRepository,
} from '../../domain/security-settings.repository';

const TO_DOMAIN_ENFORCEMENT: Record<PrismaEnforcement, MfaEnforcement> = {
  ENABLED_FOR_ALL: MfaEnforcement.EnabledForAll,
  OPTIONAL: MfaEnforcement.Optional,
  DISABLED: MfaEnforcement.Disabled,
};
const TO_PRISMA_ENFORCEMENT: Record<MfaEnforcement, PrismaEnforcement> = {
  [MfaEnforcement.EnabledForAll]: 'ENABLED_FOR_ALL',
  [MfaEnforcement.Optional]: 'OPTIONAL',
  [MfaEnforcement.Disabled]: 'DISABLED',
};
const TO_DOMAIN_METHOD: Record<PrismaMethod, MfaMethod> = {
  AUTHENTICATOR: MfaMethod.Authenticator,
  SMS: MfaMethod.Sms,
  EMAIL: MfaMethod.Email,
};
const TO_PRISMA_METHOD: Record<MfaMethod, PrismaMethod> = {
  [MfaMethod.Authenticator]: 'AUTHENTICATOR',
  [MfaMethod.Sms]: 'SMS',
  [MfaMethod.Email]: 'EMAIL',
};

/** Prisma backed adapter for the singleton SecuritySettingsRepository port. */
@Injectable()
export class SecuritySettingsPrismaRepository implements SecuritySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SecuritySettings | null> {
    const row = await this.prisma.securitySettings.findUnique({
      where: { id: SECURITY_SETTINGS_ID },
    });
    return row ? SecuritySettingsPrismaRepository.toDomain(row) : null;
  }

  async save(settings: SecuritySettings): Promise<void> {
    const data = {
      passwordMinLength: settings.passwordMinLength,
      requireUppercase: settings.requireUppercase,
      requireNumber: settings.requireNumber,
      requireSpecialChar: settings.requireSpecialChar,
      passwordExpiryDays: settings.passwordExpiryDays,
      passwordHistoryBlocked: settings.passwordHistoryBlocked,
      mfaEnforcement: TO_PRISMA_ENFORCEMENT[settings.mfaEnforcement],
      mfaMethods: settings.mfaMethods.map((method) => TO_PRISMA_METHOD[method]),
      mfaEnforcedRoles: [...settings.mfaEnforcedRoles],
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      maxConcurrentSessions: settings.maxConcurrentSessions,
      rememberDeviceDays: settings.rememberDeviceDays,
      updatedAt: settings.updatedAt,
    };
    await this.prisma.securitySettings.upsert({
      where: { id: SECURITY_SETTINGS_ID },
      create: { id: SECURITY_SETTINGS_ID, createdAt: settings.createdAt, ...data },
      update: data,
    });
  }

  private static toDomain(row: PrismaSecuritySettings): SecuritySettings {
    return SecuritySettings.rehydrate(row.id, {
      passwordMinLength: row.passwordMinLength,
      requireUppercase: row.requireUppercase,
      requireNumber: row.requireNumber,
      requireSpecialChar: row.requireSpecialChar,
      passwordExpiryDays: row.passwordExpiryDays,
      passwordHistoryBlocked: row.passwordHistoryBlocked,
      mfaEnforcement: TO_DOMAIN_ENFORCEMENT[row.mfaEnforcement],
      mfaMethods: row.mfaMethods.map((method) => TO_DOMAIN_METHOD[method]),
      mfaEnforcedRoles: row.mfaEnforcedRoles,
      sessionTimeoutMinutes: row.sessionTimeoutMinutes,
      maxConcurrentSessions: row.maxConcurrentSessions,
      rememberDeviceDays: row.rememberDeviceDays,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
