import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import { GenerateReportResult } from '../../application/use-cases/generate-report.use-case';
import { ReportFormat, ReportType } from '../../domain/report-kind';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;

/** The Generate Report action: the report kind, its format, and the market and range it covers. */
export class GenerateReportRequestDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type!: ReportType;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

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

/** The recorded report, as it appears in the Recent Report Activity feed. */
export class GenerateReportResponseDto implements GenerateReportResult {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ReportType }) type!: string;
  @ApiProperty({ example: 'Operations Report' }) title!: string;
  @ApiProperty({ enum: ReportFormat }) format!: string;
  @ApiProperty() generatedAt!: string;

  static fromResult(result: GenerateReportResult): GenerateReportResponseDto {
    return result;
  }
}
