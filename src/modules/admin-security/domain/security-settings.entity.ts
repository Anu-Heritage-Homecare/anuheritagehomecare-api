import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { MfaEnforcement } from './mfa-enforcement.enum';
import { MfaMethod } from './mfa-method.enum';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EXPIRY_DAYS = 3650;
const MAX_HISTORY = 24;
const MAX_TIMEOUT_MINUTES = 7 * 24 * 60;
const MAX_SESSIONS = 100;
const MAX_REMEMBER_DAYS = 365;
const MAX_ROLE_LABEL = 160;
const VALID_METHODS = new Set<string>(Object.values(MfaMethod));
const VALID_ENFORCEMENT = new Set<string>(Object.values(MfaEnforcement));

interface SecuritySettingsProps {
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  passwordExpiryDays: number;
  passwordHistoryBlocked: number;
  mfaEnforcement: MfaEnforcement;
  mfaMethods: MfaMethod[];
  mfaEnforcedRoles: string[];
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  rememberDeviceDays: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The singleton security policy: the password policy, the MFA mandate and the
 * session rules. Captured as the office's configured intent; enforcing it in the
 * auth flow is a later step, so changing it here does not alter how logins behave
 * today.
 */
export class SecuritySettings extends AggregateRoot<string> {
  private props: SecuritySettingsProps;

  private constructor(id: string, props: SecuritySettingsProps) {
    super(id);
    this.props = props;
  }

  public static defaults(id: string, now: Date): SecuritySettings {
    return new SecuritySettings(id, {
      passwordMinLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      passwordExpiryDays: 90,
      passwordHistoryBlocked: 5,
      mfaEnforcement: MfaEnforcement.EnabledForAll,
      mfaMethods: [MfaMethod.Authenticator, MfaMethod.Sms],
      mfaEnforcedRoles: [],
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 3,
      rememberDeviceDays: 30,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(id: string, props: SecuritySettingsProps): SecuritySettings {
    return new SecuritySettings(id, props);
  }

  /** Set the password policy (the Edit Policy action). */
  public setPasswordPolicy(
    fields: {
      passwordMinLength?: number;
      requireUppercase?: boolean;
      requireNumber?: boolean;
      requireSpecialChar?: boolean;
      passwordExpiryDays?: number;
      passwordHistoryBlocked?: number;
    },
    now: Date,
  ): void {
    if (fields.passwordMinLength !== undefined) {
      this.props.passwordMinLength = SecuritySettings.inRange(
        fields.passwordMinLength,
        MIN_PASSWORD_LENGTH,
        MAX_PASSWORD_LENGTH,
        'Minimum password length',
      );
    }
    if (fields.requireUppercase !== undefined) {
      this.props.requireUppercase = fields.requireUppercase;
    }
    if (fields.requireNumber !== undefined) {
      this.props.requireNumber = fields.requireNumber;
    }
    if (fields.requireSpecialChar !== undefined) {
      this.props.requireSpecialChar = fields.requireSpecialChar;
    }
    if (fields.passwordExpiryDays !== undefined) {
      this.props.passwordExpiryDays = SecuritySettings.inRange(
        fields.passwordExpiryDays,
        0,
        MAX_EXPIRY_DAYS,
        'Password expiry window',
      );
    }
    if (fields.passwordHistoryBlocked !== undefined) {
      this.props.passwordHistoryBlocked = SecuritySettings.inRange(
        fields.passwordHistoryBlocked,
        0,
        MAX_HISTORY,
        'Previous passwords blocked',
      );
    }
    this.props.updatedAt = now;
  }

  /** Set the MFA mandate (the Edit MFA action). */
  public setMfa(
    fields: { enforcement?: MfaEnforcement; methods?: MfaMethod[]; enforcedRoles?: string[] },
    now: Date,
  ): void {
    if (fields.enforcement !== undefined) {
      if (!VALID_ENFORCEMENT.has(fields.enforcement)) {
        throw new ValidationException('Unknown MFA enforcement level');
      }
      this.props.mfaEnforcement = fields.enforcement;
    }
    if (fields.methods !== undefined) {
      this.props.mfaMethods = SecuritySettings.cleanMethods(fields.methods);
    }
    if (fields.enforcedRoles !== undefined) {
      this.props.mfaEnforcedRoles = SecuritySettings.cleanRoles(fields.enforcedRoles);
    }
    this.props.updatedAt = now;
  }

  /** Set the session rules (the Session Config action). */
  public setSessionRules(
    fields: {
      sessionTimeoutMinutes?: number;
      maxConcurrentSessions?: number;
      rememberDeviceDays?: number;
    },
    now: Date,
  ): void {
    if (fields.sessionTimeoutMinutes !== undefined) {
      this.props.sessionTimeoutMinutes = SecuritySettings.inRange(
        fields.sessionTimeoutMinutes,
        1,
        MAX_TIMEOUT_MINUTES,
        'Session timeout',
      );
    }
    if (fields.maxConcurrentSessions !== undefined) {
      this.props.maxConcurrentSessions = SecuritySettings.inRange(
        fields.maxConcurrentSessions,
        1,
        MAX_SESSIONS,
        'Max concurrent sessions',
      );
    }
    if (fields.rememberDeviceDays !== undefined) {
      this.props.rememberDeviceDays = SecuritySettings.inRange(
        fields.rememberDeviceDays,
        0,
        MAX_REMEMBER_DAYS,
        'Remember device window',
      );
    }
    this.props.updatedAt = now;
  }

  private static inRange(value: number, min: number, max: number, label: string): number {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new ValidationException(`${label} must be a whole number between ${min} and ${max}`);
    }
    return value;
  }

  private static cleanMethods(methods: MfaMethod[]): MfaMethod[] {
    const unique = new Set<MfaMethod>();
    for (const method of methods) {
      if (!VALID_METHODS.has(method)) {
        throw new ValidationException(`Unknown MFA method: ${method}`);
      }
      unique.add(method);
    }
    if (unique.size === 0) {
      throw new ValidationException('At least one MFA method must be allowed');
    }
    return [...unique];
  }

  private static cleanRoles(roles: string[]): string[] {
    const unique = new Set<string>();
    for (const role of roles) {
      const trimmed = role.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_ROLE_LABEL) {
        throw new ValidationException('A role label must be 1 to 160 characters');
      }
      unique.add(trimmed);
    }
    return [...unique];
  }

  public get passwordMinLength(): number {
    return this.props.passwordMinLength;
  }
  public get requireUppercase(): boolean {
    return this.props.requireUppercase;
  }
  public get requireNumber(): boolean {
    return this.props.requireNumber;
  }
  public get requireSpecialChar(): boolean {
    return this.props.requireSpecialChar;
  }
  public get passwordExpiryDays(): number {
    return this.props.passwordExpiryDays;
  }
  public get passwordHistoryBlocked(): number {
    return this.props.passwordHistoryBlocked;
  }
  public get mfaEnforcement(): MfaEnforcement {
    return this.props.mfaEnforcement;
  }
  public get mfaMethods(): ReadonlyArray<MfaMethod> {
    return this.props.mfaMethods;
  }
  public get mfaEnforcedRoles(): ReadonlyArray<string> {
    return this.props.mfaEnforcedRoles;
  }
  public get sessionTimeoutMinutes(): number {
    return this.props.sessionTimeoutMinutes;
  }
  public get maxConcurrentSessions(): number {
    return this.props.maxConcurrentSessions;
  }
  public get rememberDeviceDays(): number {
    return this.props.rememberDeviceDays;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
