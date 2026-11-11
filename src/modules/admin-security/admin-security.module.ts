import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SECURITY_SETTINGS_REPOSITORY } from './domain/security-settings.repository';
import { INTEGRATION_REPOSITORY } from './domain/integration.repository';
import { ADMIN_LOGIN_HISTORY_READ_PORT } from './application/ports/admin-login-history-read.port';
import { AUDIT_RECORDER } from './application/ports/audit-recorder.port';
import { ADMIN_AUDIT_READ_PORT } from './application/ports/admin-audit-read.port';
import { GetSecurityScreenUseCase } from './application/use-cases/get-security-screen.use-case';
import {
  UpdateMfaUseCase,
  UpdatePasswordPolicyUseCase,
  UpdateSessionSettingsUseCase,
} from './application/use-cases/update-security-settings.use-cases';
import { GetLoginHistoryUseCase } from './application/use-cases/get-login-history.use-case';
import { GetAuditLogsUseCase } from './application/use-cases/get-audit-logs.use-case';
import {
  ConfigureIntegrationUseCase,
  GetIntegrationUseCase,
  ListIntegrationsUseCase,
  SetIntegrationStatusUseCase,
  TestIntegrationConnectionUseCase,
} from './application/use-cases/integrations.use-cases';
import { SecuritySettingsPrismaRepository } from './infrastructure/persistence/security-settings.prisma.repository';
import { AdminLoginHistoryReadPrisma } from './infrastructure/persistence/admin-login-history-read.prisma';
import { IntegrationPrismaRepository } from './infrastructure/persistence/integration.prisma.repository';
import { AdminAuditPrisma } from './infrastructure/persistence/audit.prisma';
import { SecurityController } from './presentation/security.controller';

/**
 * Admin Security & Integrations bounded context composition root. Powers the
 * Security tab (password policy, MFA, session rules, login history), the
 * Integrations tab and the Audit Logs tab. The audit recorder is provided here and
 * can be adopted by other admin contexts to record their actions.
 */
@Module({
  imports: [PassportModule],
  controllers: [SecurityController],
  providers: [
    GetSecurityScreenUseCase,
    UpdatePasswordPolicyUseCase,
    UpdateMfaUseCase,
    UpdateSessionSettingsUseCase,
    GetLoginHistoryUseCase,
    ListIntegrationsUseCase,
    GetIntegrationUseCase,
    SetIntegrationStatusUseCase,
    ConfigureIntegrationUseCase,
    TestIntegrationConnectionUseCase,
    GetAuditLogsUseCase,
    AdminAuditPrisma,
    { provide: SECURITY_SETTINGS_REPOSITORY, useClass: SecuritySettingsPrismaRepository },
    { provide: INTEGRATION_REPOSITORY, useClass: IntegrationPrismaRepository },
    { provide: ADMIN_LOGIN_HISTORY_READ_PORT, useClass: AdminLoginHistoryReadPrisma },
    { provide: AUDIT_RECORDER, useExisting: AdminAuditPrisma },
    { provide: ADMIN_AUDIT_READ_PORT, useExisting: AdminAuditPrisma },
  ],
})
export class AdminSecurityModule {}
