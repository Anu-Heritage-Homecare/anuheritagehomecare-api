import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, MaxLength } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import { ReportComparison } from '../../application/ports/financial-reports-read.port';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;
const COMPARISONS: ReportComparison[] = ['PREVIOUS_PERIOD', 'PREVIOUS_YEAR'];

/** The Financial Reports controls: market, date range, branch and comparison basis. */
export class FinancialReportQueryDto {
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

  @ApiPropertyOptional({ description: 'Window end (exclusive), ISO 8601; defaults to now' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Branch to scope to; omit for all branches' })
  @IsOptional()
  @MaxLength(120)
  branch?: string;

  @ApiPropertyOptional({ enum: COMPARISONS, default: 'PREVIOUS_PERIOD' })
  @IsOptional()
  @IsIn(COMPARISONS)
  comparison?: ReportComparison;
}
