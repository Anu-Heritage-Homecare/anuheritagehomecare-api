import { MfaEnforcement } from '../../domain/mfa-enforcement.enum';
import { MfaMethod } from '../../domain/mfa-method.enum';
import { SecuritySettings } from '../../domain/security-settings.entity';
import {
  SECURITY_SETTINGS_ID,
  SecuritySettingsRepository,
} from '../../domain/security-settings.repository';
import {
  AdminLoginHistoryReadPort,
  LoginHistoryEntry,
} from '../ports/admin-login-history-read.port';

export interface PasswordPolicyResult {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  expiryDays: number;
  historyBlocked: number;
}

export interface MfaConfigResult {
  enforcement: MfaEnforcement;
  methods: MfaMethod[];
  enforcedRoles: string[];
}

export interface SessionSettingsResult {
  timeoutMinutes: number;
  maxConcurrentSessions: number;
  rememberDeviceDays: number;
}

/** The whole Security tab. */
export interface SecurityScreenResult {
  passwordPolicy: PasswordPolicyResult;
  mfa: MfaConfigResult;
  session: SessionSettingsResult;
  recentLogins: LoginHistoryEntry[];
}

const RECENT_LOGIN_LIMIT = 10;

export function toSecuritySettingsResult(settings: SecuritySettings): {
  passwordPolicy: PasswordPolicyResult;
  mfa: MfaConfigResult;
  session: SessionSettingsResult;
} {
  return {
    passwordPolicy: {
      minLength: settings.passwordMinLength,
      requireUppercase: settings.requireUppercase,
      requireNumber: settings.requireNumber,
      requireSpecialChar: settings.requireSpecialChar,
      expiryDays: settings.passwordExpiryDays,
      historyBlocked: settings.passwordHistoryBlocked,
    },
    mfa: {
      enforcement: settings.mfaEnforcement,
      methods: [...settings.mfaMethods],
      enforcedRoles: [...settings.mfaEnforcedRoles],
    },
    session: {
      timeoutMinutes: settings.sessionTimeoutMinutes,
      maxConcurrentSessions: settings.maxConcurrentSessions,
      rememberDeviceDays: settings.rememberDeviceDays,
    },
  };
}

/** Assemble the whole Security tab from the settings and the recent login history. */
export async function loadSecurityScreenResult(
  settingsRepo: SecuritySettingsRepository,
  history: AdminLoginHistoryReadPort,
  now: Date,
): Promise<SecurityScreenResult> {
  const [settings, recentLogins] = await Promise.all([
    settingsRepo.get(),
    history.recent(RECENT_LOGIN_LIMIT),
  ]);
  const resolved = settings ?? SecuritySettings.defaults(SECURITY_SETTINGS_ID, now);
  return { ...toSecuritySettingsResult(resolved), recentLogins };
}
