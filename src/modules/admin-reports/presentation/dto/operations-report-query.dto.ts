import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitStatus, VisitType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';

/** The Operations Report controls: the reporting period and the four dropdowns. */
export class OperationsReportQueryDto {
  @ApiPropertyOptional({
    description: 'Period start (inclusive), ISO 8601; defaults to 30 days ago',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Period end (inclusive), ISO 8601; defaults to now' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: VisitType, description: 'Service Type filter; omit for all' })
  @IsOptional()
  @IsEnum(VisitType)
  serviceType?: VisitType;

  @ApiPropertyOptional({ description: 'Caregiver filter; omit for all' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string;

  @ApiPropertyOptional({ enum: VisitStatus, description: 'Status filter; omit for all' })
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;

  @ApiPropertyOptional({
    description: 'Branch filter, matched to the care recipient city; omit for all',
  })
  @IsOptional()
  @MaxLength(120)
  city?: string;
}
