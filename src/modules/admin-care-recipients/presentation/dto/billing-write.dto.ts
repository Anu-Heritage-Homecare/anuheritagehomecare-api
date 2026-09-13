import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const MAX_MINOR = 1_000_000_000;

class InvoiceLineItemDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) serviceName!: string;
  @ApiProperty({ minimum: 0, maximum: MAX_MINOR })
  @IsInt()
  @Min(0)
  @Max(MAX_MINOR)
  amountMinor!: number;
}

export class CreateInvoiceRequestDto {
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() periodStart!: string;
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() periodEnd!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) servicesLabel!: string;

  @ApiProperty({
    minimum: 0,
    maximum: MAX_MINOR,
    description: 'Insurance covered amount, minor units',
  })
  @IsInt()
  @Min(0)
  @Max(MAX_MINOR)
  insuranceCoveredMinor!: number;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lines!: InvoiceLineItemDto[];
}

export class RecordInvoicePaymentRequestDto {
  @ApiProperty({ minimum: 1, maximum: MAX_MINOR, description: 'Payment amount, minor units' })
  @IsInt()
  @Min(1)
  @Max(MAX_MINOR)
  amountMinor!: number;

  @ApiPropertyOptional({ description: 'How the payment was taken, for display' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  methodLabel?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  receivedAt?: string;
}

export class SetBillingProfileRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) billingContactName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  billingContactRelationship?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) billingContactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) billingContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) paymentMethodBrand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4) paymentMethodLast4?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPayEnabled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryInsuranceProvider?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryInsurancePolicyNumber?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  primaryInsuranceCoveragePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  primaryInsuranceCoverageDetails?: string;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100_000_000,
    description: 'Co-pay per visit, minor units',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  coPayPerVisitMinor?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) secondaryInsurance?: string;
}
