import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Record an offline payment (bank transfer or cheque) against an invoice. */
export class RecordInvoicePaymentRequestDto {
  @ApiProperty({
    minimum: 1,
    description: 'Amount received, in minor units (the invoice currency)',
  })
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @ApiPropertyOptional({ example: 'Bank Transfer', description: 'How the payment was made' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  methodLabel?: string;

  @ApiPropertyOptional({ description: 'When it was received (defaults to now), ISO 8601' })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional({
    example: 'TXN-1092309',
    description: 'External bank or transaction reference',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'First Bank', description: 'The paying bank' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Free text notes for reconciliation' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** The created payment and the resulting invoice settlement. */
export class RecordInvoicePaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Whether the invoice is now fully paid' })
  invoicePaid!: boolean;
}
