import { ApiProperty } from '@nestjs/swagger';
import {
  BillingInvoiceRowResult,
  BillingInvoicesListResult,
} from '../../application/dto/billing-invoices.result';
import {
  InvoiceListCounts,
  InvoiceListStatus,
} from '../../application/ports/billing-invoices-read.port';

class InvoiceListCountsDto implements InvoiceListCounts {
  @ApiProperty() all!: number;
  @ApiProperty() draft!: number;
  @ApiProperty() awaitingPayment!: number;
  @ApiProperty() partiallyPaid!: number;
  @ApiProperty() overdue!: number;
  @ApiProperty() paid!: number;
  @ApiProperty() cancelled!: number;
}

class BillingInvoiceRowDto implements BillingInvoiceRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-451' }) number!: string;
  @ApiProperty({ nullable: true, type: String }) billingAccountId!: string | null;
  @ApiProperty({ nullable: true, type: String }) billingAccountName!: string | null;
  @ApiProperty() careRecipientName!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) dueDate!: string | null;
  @ApiProperty({
    enum: ['DRAFT', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'CANCELLED'],
  })
  status!: InvoiceListStatus;
}

/** The org wide Invoices list. */
export class BillingInvoicesResponseDto implements BillingInvoicesListResult {
  @ApiProperty({ type: [BillingInvoiceRowDto] }) invoices!: BillingInvoiceRowDto[];
  @ApiProperty({ type: InvoiceListCountsDto }) tabs!: InvoiceListCountsDto;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;

  static fromResult(result: BillingInvoicesListResult): BillingInvoicesResponseDto {
    return result;
  }
}
