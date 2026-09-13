import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** The timeline filter tabs on the Health screen. */
export const HEALTH_TIMELINE_TABS = [
  'ALL',
  'VITALS',
  'INCIDENTS',
  'MEDICATION',
  'ASSESSMENTS',
  'APPOINTMENTS',
] as const;

export type HealthTimelineTab = (typeof HEALTH_TIMELINE_TABS)[number];

export class RecipientHealthQueryDto {
  @ApiPropertyOptional({ enum: HEALTH_TIMELINE_TABS, default: 'ALL' })
  @IsOptional()
  @IsIn(HEALTH_TIMELINE_TABS)
  tab?: HealthTimelineTab;

  @ApiPropertyOptional({ description: 'Search the event title and description' })
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

  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
