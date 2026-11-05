import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentListStatus } from '../../application/ports/billing-payments-read.port';

const STATUSES: PaymentListStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

/** Filters and paging for the org wide Payments list. */
export class BillingPaymentsQueryDto {
  @ApiPropertyOptional({ enum: STATUSES, description: 'Omit for the All tab' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: PaymentListStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  billingAccountId?: string;

  @ApiPropertyOptional({ description: 'Exact method label (Bank Transfer, Card Payment, ...)' })
  @IsOptional()
  @MaxLength(120)
  method?: string;

  @ApiPropertyOptional({ description: 'Earliest received date (inclusive), ISO 8601' })
  @IsOptional()
  @IsDateString()
  receivedFrom?: string;

  @ApiPropertyOptional({ description: 'Latest received date (inclusive), ISO 8601' })
  @IsOptional()
  @IsDateString()
  receivedTo?: string;

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

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
