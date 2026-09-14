import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  ActivityCategory,
  ALL_ACTIVITY_CATEGORIES,
} from '../../application/ports/recipient-activity-read.port';

export class RecipientActivityQueryDto {
  @ApiPropertyOptional({
    enum: ALL_ACTIVITY_CATEGORIES,
    description: 'The activity type filter (event category)',
  })
  @IsOptional()
  @IsIn(ALL_ACTIVITY_CATEGORIES)
  category?: ActivityCategory;

  @ApiPropertyOptional({ description: 'Filter by an exact performer name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  user?: string;

  @ApiPropertyOptional({ description: 'Search the timeline event title or description' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ default: 7, minimum: 1, maximum: 365, description: 'Date range, in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
