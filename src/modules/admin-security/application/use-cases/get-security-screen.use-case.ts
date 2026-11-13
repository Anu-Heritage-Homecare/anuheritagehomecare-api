import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  SECURITY_SETTINGS_REPOSITORY,
  SecuritySettingsRepository,
} from '../../domain/security-settings.repository';
import {
  ADMIN_LOGIN_HISTORY_READ_PORT,
  AdminLoginHistoryReadPort,
} from '../ports/admin-login-history-read.port';
import { SecurityScreenResult, loadSecurityScreenResult } from '../dto/security-screen.result';

/** Use case: read the whole Security tab (policy, MFA, session, recent logins). */
@Injectable()
export class GetSecurityScreenUseCase {
  constructor(
    @Inject(SECURITY_SETTINGS_REPOSITORY)
    private readonly settings: SecuritySettingsRepository,
    @Inject(ADMIN_LOGIN_HISTORY_READ_PORT)
    private readonly history: AdminLoginHistoryReadPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(): Promise<SecurityScreenResult> {
    return loadSecurityScreenResult(this.settings, this.history, this.clock.now());
  }
}
