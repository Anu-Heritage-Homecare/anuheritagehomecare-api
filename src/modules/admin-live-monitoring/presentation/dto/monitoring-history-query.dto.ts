import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertSeverity } from '@modules/admin-alerts/domain/alert-severity.enum';
import { AlertType } from '@modules/admin-alerts/domain/alert-type.enum';
import { IncidentCategory } from '@modules/admin-alerts/domain/incident-category.enum';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { CompletedStatusFilter } from '../../application/use-cases/monitoring-history.use-case';

const COMPLETED_STATUSES = ['ALL', 'COMPLETED', 'COMPLETED_LATE'] as const;
const SEVERITIES = Object.values(AlertSeverity);
const ALERT_TYPES = Object.values(AlertType);
const INCIDENT_CATEGORIES = Object.values(IncidentCategory);
const INCIDENT_OUTCOMES = ['RESOLVED', 'CLOSED'] as const;

/** Shared filters and pagination for the Monitoring History tabs. */
export class MonitoringHistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 30, description: 'Window in days (date range)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) branch?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() careRecipientId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() caregiverId?: string;

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

/** The Completed Visits tab adds the on-time/late status filter. */
export class CompletedVisitsQueryDto extends MonitoringHistoryQueryDto {
  @ApiPropertyOptional({ enum: COMPLETED_STATUSES, default: 'ALL' })
  @IsOptional()
  @IsIn(COMPLETED_STATUSES)
  status?: CompletedStatusFilter;
}

/** The Past Alerts tab adds the priority and alert type filters. */
export class PastAlertsQueryDto extends MonitoringHistoryQueryDto {
  @ApiPropertyOptional({ enum: SEVERITIES, description: 'Filter by priority (severity)' })
  @IsOptional()
  @IsIn(SEVERITIES)
  priority?: AlertSeverity;

  @ApiPropertyOptional({ enum: ALERT_TYPES })
  @IsOptional()
  @IsIn(ALERT_TYPES)
  alertType?: AlertType;
}

/** The Past Incidents tab adds the type, priority and outcome filters. */
export class PastIncidentsQueryDto extends MonitoringHistoryQueryDto {
  @ApiPropertyOptional({ enum: INCIDENT_CATEGORIES, description: 'Filter by incident type' })
  @IsOptional()
  @IsIn(INCIDENT_CATEGORIES)
  type?: IncidentCategory;

  @ApiPropertyOptional({ enum: SEVERITIES, description: 'Filter by priority (severity)' })
  @IsOptional()
  @IsIn(SEVERITIES)
  priority?: AlertSeverity;

  @ApiPropertyOptional({ enum: INCIDENT_OUTCOMES, description: 'Filter by outcome' })
  @IsOptional()
  @IsIn(INCIDENT_OUTCOMES)
  status?: (typeof INCIDENT_OUTCOMES)[number];
}
