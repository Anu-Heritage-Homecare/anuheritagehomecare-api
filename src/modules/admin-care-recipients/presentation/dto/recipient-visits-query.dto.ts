import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ALL_VISIT_STATUSES, VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { ALL_VISIT_TYPES, VisitType } from '@modules/visits/domain/visit-type.enum';

export class RecipientVisitsQueryDto {
  @ApiPropertyOptional({ description: 'Start of the date range (inclusive), ISO date' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'End of the date range (inclusive), ISO date' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned caregiver' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string;

  @ApiPropertyOptional({ enum: ALL_VISIT_TYPES })
  @IsOptional()
  @IsIn(ALL_VISIT_TYPES)
  visitType?: VisitType;

  @ApiPropertyOptional({ enum: ALL_VISIT_STATUSES })
  @IsOptional()
  @IsIn(ALL_VISIT_STATUSES)
  status?: VisitStatus;

  @ApiPropertyOptional({ description: 'Search the visit notes' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
