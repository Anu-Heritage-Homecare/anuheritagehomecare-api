import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import {
  ComputeAdjustmentDto,
  ComputeDiscountDto,
  ComputeLineDto,
} from './compute-invoice-totals.dto';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;

/** Raise an invoice from the Create Invoice wizard (step 5, the Create Invoice action). */
export class CreateInvoiceRequestDto {
  @ApiProperty({ description: 'The care recipient the invoice bills' })
  @IsUUID()
  careRecipientId!: string;

  @ApiProperty({ description: 'Service period start, ISO 8601 date' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ description: 'Service period end, ISO 8601 date' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 365, description: 'Defaults to the settings terms' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  paymentTermsDays?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Insurance covered portion, minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  insuranceCoveredMinor?: number;

  @ApiPropertyOptional({ enum: CURRENCIES, default: Currency.NigerianNaira })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @ApiProperty({ type: [ComputeLineDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ComputeLineDto)
  lines!: ComputeLineDto[];

  @ApiPropertyOptional({ type: [ComputeDiscountDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ComputeDiscountDto)
  discounts?: ComputeDiscountDto[];

  @ApiPropertyOptional({ type: [ComputeAdjustmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ComputeAdjustmentDto)
  adjustments?: ComputeAdjustmentDto[];
}
