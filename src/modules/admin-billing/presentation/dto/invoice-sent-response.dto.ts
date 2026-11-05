import { ApiProperty } from '@nestjs/swagger';
import { InvoiceSentResult } from '../../application/dto/invoice-sent.result';

/** Confirmation that an invoice was emailed to the client (wizard step 6). */
export class InvoiceSentResponseDto implements InvoiceSentResult {
  @ApiProperty({ example: 'INV-2026-451' }) invoiceNumber!: string;
  @ApiProperty({ example: 'j****@example.com' }) sentTo!: string;
  @ApiProperty() sentAt!: string;

  static fromResult(result: InvoiceSentResult): InvoiceSentResponseDto {
    return result;
  }
}
