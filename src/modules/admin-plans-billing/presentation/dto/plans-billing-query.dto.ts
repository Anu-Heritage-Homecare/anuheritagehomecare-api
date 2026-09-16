import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;

/**
 * The market selector for the Plans and Billing panel. Every figure is scoped to
 * this currency so sums stay honest; defaults to USD when omitted.
 */
export class PlansBillingQueryDto {
  @ApiPropertyOptional({ enum: CURRENCIES, default: Currency.UnitedStatesDollar })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;
}
