import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const TABS = ['ALL', 'ACTIVE', 'ON_HOLD', 'HIGH_PRIORITY', 'NEW'] as const;
const SORTS = ['NAME', 'AGE', 'PRIORITY', 'STATUS', 'RECENT'] as const;

export class ListCareRecipientsQueryDto {
  @ApiPropertyOptional({ enum: TABS, default: 'ALL' })
  @IsOptional()
  @IsIn(TABS)
  tab?: (typeof TABS)[number];

  @ApiPropertyOptional({ description: 'Search by name, ID (CR-001) or condition' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: SORTS, default: 'NAME' })
  @IsOptional()
  @IsIn(SORTS)
  sort?: (typeof SORTS)[number];

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  direction?: 'ASC' | 'DESC';

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
