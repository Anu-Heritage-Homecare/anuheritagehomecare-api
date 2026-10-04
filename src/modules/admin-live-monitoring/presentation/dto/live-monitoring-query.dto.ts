import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const SERVICE_TYPES = Object.values(VisitType);

/** The branch and service type filters shared across the Live Monitoring tabs. */
export class LiveMonitoringQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) branch?: string;
  @ApiPropertyOptional({ enum: SERVICE_TYPES })
  @IsOptional()
  @IsIn(SERVICE_TYPES)
  serviceType?: VisitType;
}

/** The Active Visits tab filters with pagination. */
export class ActiveVisitsQueryDto extends LiveMonitoringQueryDto {
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
