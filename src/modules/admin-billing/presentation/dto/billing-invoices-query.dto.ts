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
import { InvoiceListStatus } from '../../application/ports/billing-invoices-read.port';

const STATUSES: InvoiceListStatus[] = [
  'DRAFT',
  'AWAITING_PAYMENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
];

/** Filters and paging for the org wide Invoices list. */
export class BillingInvoicesQueryDto {
  @ApiPropertyOptional({ enum: STATUSES, description: 'Omit for the All tab' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: InvoiceListStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  billingAccountId?: string;

  @ApiPropertyOptional({ description: 'Earliest due date (inclusive), ISO 8601' })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiPropertyOptional({ description: 'Latest due date (inclusive), ISO 8601' })
  @IsOptional()
  @IsDateString()
  dueTo?: string;

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
