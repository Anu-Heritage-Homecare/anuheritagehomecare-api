import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;
const STATUSES = Object.values(PaymentStatus);

/** Filters and paging for the transaction log. */
export class TransactionsQueryDto {
  @ApiPropertyOptional({ enum: CURRENCIES, default: Currency.UnitedStatesDollar })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: PaymentStatus;

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
