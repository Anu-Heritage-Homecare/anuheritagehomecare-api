import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AlertsTab } from '../../application/use-cases/get-alerts-overview.use-case';

const TABS = ['ALL', 'ACTIVE_ALERTS', 'EMERGENCIES', 'RESOLVED'] as const;
const SERVICE_TYPES = Object.values(VisitType);

/** Filters for the Alerts and Incidents screen. */
export class AlertsOverviewQueryDto {
  @ApiPropertyOptional({ enum: TABS, default: 'ALL' })
  @IsOptional()
  @IsIn(TABS)
  tab?: AlertsTab;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) branch?: string;

  @ApiPropertyOptional({ enum: SERVICE_TYPES })
  @IsOptional()
  @IsIn(SERVICE_TYPES)
  serviceType?: VisitType;
}
