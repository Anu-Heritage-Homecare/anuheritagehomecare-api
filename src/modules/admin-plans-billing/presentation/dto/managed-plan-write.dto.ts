import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '@modules/admin-care-plans/domain/billing-cycle.enum';
import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { Currency } from '@shared/domain/currency.enum';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const BILLING_MODELS = Object.values(BillingModel);
const BILLING_CYCLES = Object.values(BillingCycle);
const CURRENCIES = [Currency.UnitedStatesDollar, Currency.NigerianNaira] as const;
const COUNTRIES = ['US', 'NG'] as const;

/** The general overview of a plan, used for create and the General tab edit. */
export class OverviewDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @MaxLength(500) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) targetAudience?: string;
  @ApiProperty({ enum: BILLING_MODELS }) @IsIn(BILLING_MODELS) billingModel!: BillingModel;

  @ApiProperty({ enum: COUNTRIES, isArray: true })
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(COUNTRIES, { each: true })
  countriesEnabled!: string[];

  @ApiProperty({ enum: CURRENCIES, isArray: true })
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(CURRENCIES, { each: true })
  supportedCurrencies!: Currency[];

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minimumBillingHours?: number;
}

/** The renewal and billing lifecycle rules, used for create and the Renewal tab edit. */
export class LifecycleDto {
  @ApiProperty() @IsBoolean() autoRenewal!: boolean;
  @ApiProperty({ enum: BILLING_CYCLES }) @IsIn(BILLING_CYCLES) billingCycle!: BillingCycle;
  @ApiProperty() @IsInt() @Min(0) gracePeriodDays!: number;
  @ApiProperty() @IsInt() @Min(0) cancellationNoticeDays!: number;
}

class PriceStructureDto {
  @ApiProperty({ enum: CURRENCIES }) @IsIn(CURRENCIES) currency!: Currency;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) monthlyPriceMinor?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) baseRateMinor?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) emergencyDispatchRateMinor?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) weekendPremiumMinor?: number;
}

class ServiceDto {
  @ApiProperty() @IsString() @MaxLength(60) key!: string;
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @MaxLength(300) description!: string;
  @ApiProperty() @IsBoolean() enabled!: boolean;
}

class VolumeDiscountDto {
  @ApiProperty() @IsInt() @Min(0) thresholdHours!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(10_000) percentBps!: number;
}

/** Create a custom plan: its general overview and lifecycle rules. */
export class CreateManagedPlanRequestDto {
  @ApiProperty({ type: OverviewDto })
  @ValidateNested()
  @Type(() => OverviewDto)
  overview!: OverviewDto;

  @ApiProperty({ type: LifecycleDto })
  @ValidateNested()
  @Type(() => LifecycleDto)
  lifecycle!: LifecycleDto;
}

/** The per currency pricing structures for a plan. */
export class PricingRequestDto {
  @ApiProperty({ type: [PriceStructureDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PriceStructureDto)
  prices!: PriceStructureDto[];
}

/** The services included in a plan. */
export class ServicesRequestDto {
  @ApiProperty({ type: [ServiceDto] })
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services!: ServiceDto[];
}

/** The volume discount tiers for a plan. */
export class VolumeDiscountsRequestDto {
  @ApiProperty({ type: [VolumeDiscountDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => VolumeDiscountDto)
  discounts!: VolumeDiscountDto[];
}

/** The coverage areas a plan serves. */
export class CoverageRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  coverageAreas!: string[];
}

/** The eligibility rules for a plan. */
export class EligibilityRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  eligibilityRules!: string[];
}
