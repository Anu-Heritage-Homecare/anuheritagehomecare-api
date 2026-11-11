import { ApiProperty } from '@nestjs/swagger';
import { AuditCategory } from '../../domain/audit-category.enum';
import { IntegrationCategory } from '../../domain/integration-category.enum';
import { IntegrationStatus } from '../../domain/integration-status.enum';
import { LoginEventOutcome } from '../../domain/login-event-outcome.enum';
import { MfaEnforcement } from '../../domain/mfa-enforcement.enum';
import { MfaMethod } from '../../domain/mfa-method.enum';
import { SecurityScreenResult } from '../../application/dto/security-screen.result';
import { IntegrationResult } from '../../application/dto/integrations.result';
import { LoginHistoryPageResult } from '../../application/use-cases/get-login-history.use-case';
import { AuditLogsPageResult } from '../../application/use-cases/get-audit-logs.use-case';

class PasswordPolicyResponseDto {
  @ApiProperty() minLength!: number;
  @ApiProperty() requireUppercase!: boolean;
  @ApiProperty() requireNumber!: boolean;
  @ApiProperty() requireSpecialChar!: boolean;
  @ApiProperty() expiryDays!: number;
  @ApiProperty() historyBlocked!: number;
}

class MfaConfigResponseDto {
  @ApiProperty({ enum: MfaEnforcement }) enforcement!: MfaEnforcement;
  @ApiProperty({ enum: MfaMethod, isArray: true }) methods!: MfaMethod[];
  @ApiProperty({ type: [String] }) enforcedRoles!: string[];
}

class SessionSettingsResponseDto {
  @ApiProperty() timeoutMinutes!: number;
  @ApiProperty() maxConcurrentSessions!: number;
  @ApiProperty() rememberDeviceDays!: number;
}

class LoginHistoryEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true, type: String }) operatorName!: string | null;
  @ApiProperty({ enum: LoginEventOutcome }) outcome!: LoginEventOutcome;
  @ApiProperty({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiProperty({ nullable: true, type: String }) deviceLabel!: string | null;
  @ApiProperty() at!: Date;
}

/** The whole Security tab. */
export class SecurityScreenResponseDto {
  @ApiProperty({ type: PasswordPolicyResponseDto }) passwordPolicy!: PasswordPolicyResponseDto;
  @ApiProperty({ type: MfaConfigResponseDto }) mfa!: MfaConfigResponseDto;
  @ApiProperty({ type: SessionSettingsResponseDto }) session!: SessionSettingsResponseDto;
  @ApiProperty({ type: [LoginHistoryEntryResponseDto] })
  recentLogins!: LoginHistoryEntryResponseDto[];

  static fromResult(result: SecurityScreenResult): SecurityScreenResponseDto {
    return Object.assign(new SecurityScreenResponseDto(), result);
  }
}

export class IntegrationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: IntegrationCategory }) category!: IntegrationCategory;
  @ApiProperty({ enum: IntegrationStatus }) status!: IntegrationStatus;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: Object }) config!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true, type: Date }) connectedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date }) lastSyncAt!: Date | null;

  static fromResult(result: IntegrationResult): IntegrationResponseDto {
    return Object.assign(new IntegrationResponseDto(), result);
  }
}

export class TestConnectionResponseDto {
  @ApiProperty() ok!: boolean;
  @ApiProperty() message!: string;

  static fromResult(result: { ok: boolean; message: string }): TestConnectionResponseDto {
    return Object.assign(new TestConnectionResponseDto(), result);
  }
}

export class LoginHistoryPageResponseDto {
  @ApiProperty({ type: [LoginHistoryEntryResponseDto] }) entries!: LoginHistoryEntryResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;

  static fromResult(result: LoginHistoryPageResult): LoginHistoryPageResponseDto {
    return Object.assign(new LoginHistoryPageResponseDto(), result);
  }
}

class AuditLogEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) actorName!: string | null;
  @ApiProperty({ enum: AuditCategory }) category!: AuditCategory;
  @ApiProperty() action!: string;
  @ApiProperty() summary!: string;
  @ApiProperty({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiProperty() at!: Date;
}

export class AuditLogsPageResponseDto {
  @ApiProperty({ type: [AuditLogEntryResponseDto] }) entries!: AuditLogEntryResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;

  static fromResult(result: AuditLogsPageResult): AuditLogsPageResponseDto {
    return Object.assign(new AuditLogsPageResponseDto(), result);
  }
}
