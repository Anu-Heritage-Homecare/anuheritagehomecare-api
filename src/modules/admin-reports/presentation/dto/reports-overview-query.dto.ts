import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;

/** The Reports screen controls: the market and the date range (the range dropdown). */
export class ReportsOverviewQueryDto {
  @ApiPropertyOptional({ enum: CURRENCIES, default: Currency.NigerianNaira })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Window start (inclusive), ISO 8601; defaults to 30 days ago',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Window end (inclusive), ISO 8601; defaults to now' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
