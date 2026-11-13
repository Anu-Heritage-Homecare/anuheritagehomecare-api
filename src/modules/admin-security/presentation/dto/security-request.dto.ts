import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditCategory } from '../../domain/audit-category.enum';
import { IntegrationStatus } from '../../domain/integration-status.enum';
import { MfaEnforcement } from '../../domain/mfa-enforcement.enum';
import { MfaMethod } from '../../domain/mfa-method.enum';

/** Edit the password policy (the Edit Policy action). */
export class UpdatePasswordPolicyRequestDto {
  @ApiPropertyOptional({ minimum: 6, maximum: 128, example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(128)
  passwordMinLength?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireUppercase?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireSpecialChar?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 3650, example: 90, description: '0 means never' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  passwordExpiryDays?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  passwordHistoryBlocked?: number;
}

/** Edit the MFA mandate (the Edit MFA action). */
export class UpdateMfaRequestDto {
  @ApiPropertyOptional({ enum: MfaEnforcement })
  @IsOptional()
  @IsEnum(MfaEnforcement)
  enforcement?: MfaEnforcement;

  @ApiPropertyOptional({ enum: MfaMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(MfaMethod, { each: true })
  methods?: MfaMethod[];

  @ApiPropertyOptional({ type: [String], description: 'Role labels the mandate applies to' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  enforcedRoles?: string[];
}

/** Edit the session rules (the Session Config action). */
export class UpdateSessionSettingsRequestDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 10080, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10080)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxConcurrentSessions?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 365, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  rememberDeviceDays?: number;
}

/** Connect or disconnect an integration. */
export class SetIntegrationStatusRequestDto {
  @ApiProperty({ enum: IntegrationStatus }) @IsEnum(IntegrationStatus) status!: IntegrationStatus;
}

/** The direction calendar events flow (the Configure Integration drawer). */
export enum GoogleCalendarSyncDirection {
  TwoWay = 'TWO_WAY',
  Inbound = 'INBOUND',
  Outbound = 'OUTBOUND',
}

/** Which event kinds sync to the calendar. */
export enum GoogleCalendarSyncEvent {
  VisitsAndCareShifts = 'VISITS_AND_CARE_SHIFTS',
  StaffMeetings = 'STAFF_MEETINGS',
  TaskReminders = 'TASK_REMINDERS',
}

/**
 * Save an integration's configuration. This shape is the Google Calendar config
 * (the only Configure drawer today); it is validated here and stored as the
 * integration's opaque config. Other integrations add their own typed body.
 */
export class ConfigureIntegrationRequestDto {
  @ApiProperty({ enum: GoogleCalendarSyncDirection })
  @IsEnum(GoogleCalendarSyncDirection)
  syncDirection!: GoogleCalendarSyncDirection;

  @ApiProperty({ example: 'CareProfs Primary Calendar' })
  @IsString()
  @MaxLength(160)
  targetCalendar!: string;

  @ApiProperty({ enum: GoogleCalendarSyncEvent, isArray: true })
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(GoogleCalendarSyncEvent, { each: true })
  syncEvents!: GoogleCalendarSyncEvent[];

  @ApiProperty({ minimum: 5, maximum: 1440, example: 15 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  autoSyncIntervalMinutes!: number;
}

/** Pagination for the login history (View All Logs). */
export class LoginHistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** Pagination and category filter for the audit logs. */
export class AuditLogsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: AuditCategory })
  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;
}
