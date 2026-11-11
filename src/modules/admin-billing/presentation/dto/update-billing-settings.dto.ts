import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import { BillingPaymentMethodKind } from '../../domain/billing-payment-method-kind.enum';

const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;

/** Save the invoice, automation and notification preferences. All fields optional. */
export class UpdateBillingSettingsRequestDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 365, example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  defaultPaymentTermsDays?: number;

  @ApiPropertyOptional({ minLength: 1, maxLength: 10, example: 'INV-' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  invoicePrefix?: string;

  @ApiPropertyOptional({ enum: CURRENCIES })
  @IsOptional()
  @IsIn(CURRENCIES)
  defaultCurrency?: Currency;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 7.5, description: 'Percent' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  standardTaxRatePercent?: number;

  @ApiPropertyOptional({ description: 'Whether listed prices already include VAT' })
  @IsOptional()
  @IsBoolean()
  includeVatInPricing?: boolean;

  @ApiPropertyOptional({ enum: BillingPaymentMethodKind, nullable: true })
  @IsOptional()
  @ValidateIf((object: { defaultPaymentMethod?: unknown }) => object.defaultPaymentMethod !== null)
  @IsEnum(BillingPaymentMethodKind)
  defaultPaymentMethod?: BillingPaymentMethodKind | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoNumbering?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSendInvoices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paymentReminders?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  reminderDaysBefore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overdueNotifications?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  overdueNoticeDaysAfter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoReceipts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppNotifications?: boolean;

  @ApiPropertyOptional({ maxLength: 160, example: 'CareProfs Medical Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @ApiPropertyOptional({ maxLength: 300, example: '12 Medical Road, Ikeja, Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyAddress?: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'First Bank' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional({ maxLength: 40, example: '1029302910' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ maxLength: 160, example: 'CareProfs Medical Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bankAccountName?: string;
}
