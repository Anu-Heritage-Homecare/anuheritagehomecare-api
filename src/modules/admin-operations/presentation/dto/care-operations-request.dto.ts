import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import { AutoAssignAlgorithm } from '../../domain/auto-assign-algorithm.enum';
import { RateUnit } from '../../domain/rate-unit.enum';

/** A base rate for a visit format in one currency (integer minor units). */
export class RateDto {
  @ApiProperty({ enum: Currency }) @IsEnum(Currency) currency!: Currency;

  @ApiProperty({ minimum: 0, description: 'Integer minor units (kobo, cents)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseRateMinor!: number;
}

/** Add a service offering (the Add Service action). */
export class AddServiceRequestDto {
  @ApiProperty({ example: 'Nursing Care' }) @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Edit a service offering, including its enable/disable toggle. */
export class UpdateServiceRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Add a visit format with its per currency rates (the Add Format action). */
export class AddVisitFormatRequestDto {
  @ApiProperty({ example: 'Overnight Care' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Minutes, or null for a varying duration' })
  @IsOptional()
  @ValidateIf((object: AddVisitFormatRequestDto) => object.durationMinutes !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ enum: RateUnit })
  @IsOptional()
  @IsEnum(RateUnit)
  rateUnit?: RateUnit;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [RateDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RateDto)
  rates?: RateDto[];
}

/** Edit a visit format and/or its rates (all fields optional). */
export class UpdateVisitFormatRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((object: UpdateVisitFormatRequestDto) => object.durationMinutes !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ enum: RateUnit })
  @IsOptional()
  @IsEnum(RateUnit)
  rateUnit?: RateUnit;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [RateDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RateDto)
  rates?: RateDto[];
}

/** Revise the scheduling guardrails (the per row Edit actions). */
export class UpdateGuardrailsRequestDto {
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumNoticeHours?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelBufferMinutes?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxVisitsPerCaregiverPerDay?: number;

  @ApiPropertyOptional({ enum: AutoAssignAlgorithm })
  @IsOptional()
  @IsEnum(AutoAssignAlgorithm)
  autoAssignAlgorithm?: AutoAssignAlgorithm;
}
