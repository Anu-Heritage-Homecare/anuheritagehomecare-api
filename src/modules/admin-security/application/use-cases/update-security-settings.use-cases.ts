import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { AuditCategory } from '../../domain/audit-category.enum';
import { MfaEnforcement } from '../../domain/mfa-enforcement.enum';
import { MfaMethod } from '../../domain/mfa-method.enum';
import { SecuritySettings } from '../../domain/security-settings.entity';
import {
  SECURITY_SETTINGS_ID,
  SECURITY_SETTINGS_REPOSITORY,
  SecuritySettingsRepository,
} from '../../domain/security-settings.repository';
import {
  ADMIN_LOGIN_HISTORY_READ_PORT,
  AdminLoginHistoryReadPort,
} from '../ports/admin-login-history-read.port';
import { AUDIT_RECORDER, AuditRecorder } from '../ports/audit-recorder.port';
import { SecurityScreenResult, loadSecurityScreenResult } from '../dto/security-screen.result';

/** The admin performing the action, for the audit trail. */
export interface AuditActor {
  adminId: string | null;
  name: string | null;
}

interface MutationDeps {
  settings: SecuritySettingsRepository;
  history: AdminLoginHistoryReadPort;
  audit: AuditRecorder;
  clock: Clock;
}

async function applySecurityChange(
  deps: MutationDeps,
  actor: AuditActor,
  action: string,
  summary: string,
  change: (settings: SecuritySettings, now: Date) => void,
): Promise<SecurityScreenResult> {
  const now = deps.clock.now();
  const settings =
    (await deps.settings.get()) ?? SecuritySettings.defaults(SECURITY_SETTINGS_ID, now);
  change(settings, now);
  await deps.settings.save(settings);
  await deps.audit.record({
    actorAdminId: actor.adminId,
    actorName: actor.name,
    category: AuditCategory.Security,
    action,
    summary,
  });
  return loadSecurityScreenResult(deps.settings, deps.history, now);
}

export interface UpdatePasswordPolicyCommand {
  actor: AuditActor;
  passwordMinLength?: number;
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
  passwordExpiryDays?: number;
  passwordHistoryBlocked?: number;
}

/** Use case: edit the password policy (the Edit Policy action). */
@Injectable()
export class UpdatePasswordPolicyUseCase {
  constructor(
    @Inject(SECURITY_SETTINGS_REPOSITORY) private readonly settings: SecuritySettingsRepository,
    @Inject(ADMIN_LOGIN_HISTORY_READ_PORT) private readonly history: AdminLoginHistoryReadPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: UpdatePasswordPolicyCommand): Promise<SecurityScreenResult> {
    const { actor, ...fields } = command;
    return applySecurityChange(
      { settings: this.settings, history: this.history, audit: this.audit, clock: this.clock },
      actor,
      'security.password_policy.updated',
      'Updated the password policy',
      (settings, now) => settings.setPasswordPolicy(fields, now),
    );
  }
}

export interface UpdateMfaCommand {
  actor: AuditActor;
  enforcement?: MfaEnforcement;
  methods?: MfaMethod[];
  enforcedRoles?: string[];
}

/** Use case: edit the MFA mandate (the Edit MFA action). */
@Injectable()
export class UpdateMfaUseCase {
  constructor(
    @Inject(SECURITY_SETTINGS_REPOSITORY) private readonly settings: SecuritySettingsRepository,
    @Inject(ADMIN_LOGIN_HISTORY_READ_PORT) private readonly history: AdminLoginHistoryReadPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: UpdateMfaCommand): Promise<SecurityScreenResult> {
    const { actor, ...fields } = command;
    return applySecurityChange(
      { settings: this.settings, history: this.history, audit: this.audit, clock: this.clock },
      actor,
      'security.mfa.updated',
      'Updated the multi-factor authentication policy',
      (settings, now) => settings.setMfa(fields, now),
    );
  }
}

export interface UpdateSessionSettingsCommand {
  actor: AuditActor;
  sessionTimeoutMinutes?: number;
  maxConcurrentSessions?: number;
  rememberDeviceDays?: number;
}

/** Use case: edit the session rules (the Session Config action). */
@Injectable()
export class UpdateSessionSettingsUseCase {
  constructor(
    @Inject(SECURITY_SETTINGS_REPOSITORY) private readonly settings: SecuritySettingsRepository,
    @Inject(ADMIN_LOGIN_HISTORY_READ_PORT) private readonly history: AdminLoginHistoryReadPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: UpdateSessionSettingsCommand): Promise<SecurityScreenResult> {
    const { actor, ...fields } = command;
    return applySecurityChange(
      { settings: this.settings, history: this.history, audit: this.audit, clock: this.clock },
      actor,
      'security.session.updated',
      'Updated the session settings',
      (settings, now) => settings.setSessionRules(fields, now),
    );
  }
}
