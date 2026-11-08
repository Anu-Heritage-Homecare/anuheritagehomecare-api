import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { WriteOffInvoiceResult } from '../../application/use-cases/write-off-invoice.use-case';

/**
 * The Confirm Write-off modal: write off the full outstanding balance as uncollectable bad
 * debt. The reason is the chosen category; the justification is the mandatory ledger note.
 */
export class WriteOffInvoiceRequestDto {
  @ApiProperty({
    maxLength: 120,
    example: 'Uncollectable Debt',
    description: 'Reason for the write-off',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  reason!: string;

  @ApiProperty({
    maxLength: 360,
    description: 'Mandatory approval notes and justification for the audit ledger',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(360)
  justification!: string;
}

/** The outcome of writing off an invoice: its new terminal status. */
export class WriteOffInvoiceResponseDto implements WriteOffInvoiceResult {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['WRITTEN_OFF'] }) status!: 'WRITTEN_OFF';

  static fromResult(result: WriteOffInvoiceResult): WriteOffInvoiceResponseDto {
    return result;
  }
}
