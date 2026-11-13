import { ApiProperty } from '@nestjs/swagger';
import {
  InvoiceHistoryEventResult,
  InvoiceHistoryResult,
} from '../../application/dto/billing-invoice-history.result';
import { InvoiceHistoryEventType } from '../../application/ports/billing-invoices-read.port';

class InvoiceHistoryEventDto implements InvoiceHistoryEventResult {
  @ApiProperty({
    enum: [
      'INVOICE_CREATED',
      'INVOICE_APPROVED',
      'INVOICE_SENT',
      'INVOICE_VIEWED',
      'INVOICE_REMINDER_SENT',
      'INVOICE_CANCELLED',
      'INVOICE_WRITTEN_OFF',
      'PAYMENT_RECORDED',
    ],
  })
  type!: InvoiceHistoryEventType;
  @ApiProperty() title!: string;
  @ApiProperty() at!: string;
  @ApiProperty({ nullable: true, type: Number }) amountMinor!: number | null;
  @ApiProperty({ nullable: true, type: String }) methodLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) detail!: string | null;
  @ApiProperty({ nullable: true, type: String }) performedBy!: string | null;
}

/** The invoice History tab (the evidenced lifecycle timeline). */
export class BillingInvoiceHistoryResponseDto implements InvoiceHistoryResult {
  @ApiProperty({ type: [InvoiceHistoryEventDto] }) events!: InvoiceHistoryEventDto[];
  @ApiProperty() total!: number;

  static fromResult(result: InvoiceHistoryResult): BillingInvoiceHistoryResponseDto {
    return result;
  }
}
