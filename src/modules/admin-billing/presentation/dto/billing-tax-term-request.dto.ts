import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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
import { TaxScope } from '../../domain/tax-scope.enum';

/** Add a tax (the Add Tax action). */
export class CreateTaxRequestDto {
  @ApiProperty({ example: 'VAT' }) @IsString() @MinLength(1) @MaxLength(80) name!: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 7.5, description: 'Percent' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent!: number;

  @ApiProperty({ enum: TaxScope }) @IsEnum(TaxScope) scope!: TaxScope;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Edit a tax (all fields optional). */
export class UpdateTaxRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent?: number;

  @ApiPropertyOptional({ enum: TaxScope }) @IsOptional() @IsEnum(TaxScope) scope?: TaxScope;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Add a payment term (the Add Term action). A custom term omits net days. */
export class CreatePaymentTermRequestDto {
  @ApiProperty({ example: 'Net 30' }) @IsString() @MinLength(1) @MaxLength(80) name!: string;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 365, example: 30 })
  @IsOptional()
  @ValidateIf((object: CreatePaymentTermRequestDto) => object.netDays !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  netDays?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustom?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Edit a payment term (all fields optional). */
export class UpdatePaymentTermRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 365 })
  @IsOptional()
  @ValidateIf((object: UpdatePaymentTermRequestDto) => object.netDays !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  netDays?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustom?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
