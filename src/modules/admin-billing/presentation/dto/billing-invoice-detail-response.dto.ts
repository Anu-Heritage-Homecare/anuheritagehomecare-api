import { ApiProperty } from '@nestjs/swagger';
import {
  BillingInvoiceDetailResult,
  BillingInvoiceLineResult,
} from '../../application/dto/billing-invoice-detail.result';
import { InvoiceListStatus } from '../../application/ports/billing-invoices-read.port';

class BillingInvoiceLineDto implements BillingInvoiceLineResult {
  @ApiProperty() serviceName!: string;
  @ApiProperty({ nullable: true, type: Number }) quantity!: number | null;
  @ApiProperty({ nullable: true, type: String }) unit!: string | null;
  @ApiProperty({ nullable: true, type: Number }) rateMinor!: number | null;
  @ApiProperty() amountMinor!: number;
}

/** The single invoice detail (the Overview tab). */
export class BillingInvoiceDetailResponseDto implements BillingInvoiceDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-451' }) number!: string;
  @ApiProperty({ enum: ['DRAFT', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'] })
  status!: InvoiceListStatus;
  @ApiProperty({ nullable: true, type: String }) billingAccountId!: string | null;
  @ApiProperty({ nullable: true, type: String }) billingAccountName!: string | null;
  @ApiProperty() careRecipientName!: string;
  @ApiProperty({ nullable: true, type: String }) careRecipientPhotoKey!: string | null;
  @ApiProperty() invoiceDate!: string;
  @ApiProperty({ nullable: true, type: String }) dueDate!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'Net 30' }) paymentTerms!: string | null;
  @ApiProperty() servicePeriodStart!: string;
  @ApiProperty() servicePeriodEnd!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() totalAmountMinor!: number;
  @ApiProperty() insuranceCoveredMinor!: number;
  @ApiProperty() amountPaidMinor!: number;
  @ApiProperty() balanceDueMinor!: number;
  @ApiProperty({ minimum: 0, maximum: 100 }) percentPaid!: number;
  @ApiProperty({ type: [BillingInvoiceLineDto] }) lineItems!: BillingInvoiceLineDto[];

  static fromResult(result: BillingInvoiceDetailResult): BillingInvoiceDetailResponseDto {
    return result;
  }
}
