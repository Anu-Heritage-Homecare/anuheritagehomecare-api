import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';
import {
  ALL_ACCOUNT_ADJUSTMENT_CATEGORIES,
  AccountAdjustmentCategory,
} from '../../domain/account-adjustment-category.enum';
import {
  ALL_ACCOUNT_ADJUSTMENT_STATUSES,
  AccountAdjustmentStatus,
} from '../../domain/account-adjustment-status.enum';

/** Filters and paging for the Credits & Adjustments list. */
export class AccountAdjustmentsQueryDto {
  @ApiPropertyOptional({
    enum: ALL_ACCOUNT_ADJUSTMENT_CATEGORIES,
    description: 'The active tab; omit for every category',
  })
  @IsOptional()
  @IsEnum(AccountAdjustmentCategory)
  category?: AccountAdjustmentCategory;

  @ApiPropertyOptional({ enum: ALL_ACCOUNT_ADJUSTMENT_STATUSES })
  @IsOptional()
  @IsEnum(AccountAdjustmentStatus)
  status?: AccountAdjustmentStatus;

  @ApiPropertyOptional({ description: 'Exact Type value (for example "Account Credit")' })
  @IsOptional()
  @MaxLength(80)
  type?: string;

  @ApiPropertyOptional({ description: 'Matches reference, billing account or reason' })
  @IsOptional()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Lowest amount, in minor units' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAmountMinor?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Highest amount, in minor units' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAmountMinor?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
