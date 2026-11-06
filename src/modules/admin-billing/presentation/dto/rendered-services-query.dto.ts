import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;

/** The billing period and market for the Select Billable Services step. */
export class RenderedServicesQueryDto {
  @ApiPropertyOptional({ enum: CURRENCIES, default: Currency.NigerianNaira })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @ApiProperty({ description: 'Billing period start (inclusive), ISO 8601' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Billing period end (inclusive), ISO 8601' })
  @IsDateString()
  to!: string;
}
