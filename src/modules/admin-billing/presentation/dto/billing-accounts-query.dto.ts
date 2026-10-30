import { ApiPropertyOptional } from '@nestjs/swagger';
import { FamilyMemberStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';

const TABS = ['ALL', 'OUTSTANDING', 'INACTIVE'] as const;
const STATUSES = Object.values(FamilyMemberStatus);

/** Filters and paging for the Billing Accounts list. */
export class BillingAccountsQueryDto {
  @ApiPropertyOptional({ enum: TABS, default: 'ALL' })
  @IsOptional()
  @IsIn(TABS)
  tab?: (typeof TABS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(120)
  branch?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: FamilyMemberStatus;

  @ApiPropertyOptional({ minimum: 0, description: 'Lowest outstanding balance, in minor units' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBalanceMinor?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Highest outstanding balance, in minor units' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBalanceMinor?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
