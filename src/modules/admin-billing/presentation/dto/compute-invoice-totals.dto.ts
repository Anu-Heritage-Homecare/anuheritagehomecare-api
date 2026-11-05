import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import { DiscountKind } from '../../domain/invoice-totals.calculator';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;
const DISCOUNT_KINDS: DiscountKind[] = ['PERCENT', 'FIXED'];

export class ComputeLineDto {
  @ApiProperty({ description: 'A billable service id from the catalog' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ minimum: 0, description: 'Hours, sessions, or 1 for a fixed fee' })
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class ComputeDiscountDto {
  @ApiProperty({ maxLength: 120, example: 'Loyalty Discount' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ enum: DISCOUNT_KINDS })
  @IsIn(DISCOUNT_KINDS)
  kind!: DiscountKind;

  @ApiProperty({ minimum: 0, description: 'Percent (0 to 100) for PERCENT, minor units for FIXED' })
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  value!: number;
}

export class ComputeAdjustmentDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({
    description: 'Signed amount in minor units (surcharge positive, reduction negative)',
  })
  @IsInt()
  amountMinor!: number;
}

/** Compute the invoice totals for the Create Invoice wizard (step 4). */
export class ComputeInvoiceTotalsRequestDto {
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
