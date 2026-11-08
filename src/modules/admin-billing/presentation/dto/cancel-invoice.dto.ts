import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CancelInvoiceResult } from '../../application/use-cases/cancel-invoice.use-case';

/** The Cancel Invoice modal: void a pending invoice with a reason and internal notes. */
export class CancelInvoiceRequestDto {
  @ApiProperty({ maxLength: 120, example: 'Billing Error', description: 'Reason for cancellation' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  reason!: string;

  @ApiPropertyOptional({ maxLength: 360, description: 'Internal correction notes for the audit' })
  @IsOptional()
  @IsString()
  @MaxLength(360)
  notes?: string;
}

/** The outcome of cancelling an invoice: its new status. */
export class CancelInvoiceResponseDto implements CancelInvoiceResult {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['CANCELLED'] }) status!: 'CANCELLED';

  static fromResult(result: CancelInvoiceResult): CancelInvoiceResponseDto {
    return result;
  }
}
