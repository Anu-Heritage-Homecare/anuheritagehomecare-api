import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaregiverStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const STATUSES = Object.values(CaregiverStatus);
const NOTE_TYPES = ['VISIT', 'SUPERVISOR', 'INTERNAL', 'TRAINING'] as const;

/** Filters and paging for the caregivers directory. */
export class CaregiversQueryDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: CaregiverStatus;

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

/** Filters, date range and paging for the caregiver Notes tab. */
export class CaregiverNotesQueryDto {
  @ApiPropertyOptional({ enum: NOTE_TYPES })
  @IsOptional()
  @IsIn(NOTE_TYPES)
  type?: (typeof NOTE_TYPES)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
