import { ApiProperty } from '@nestjs/swagger';
import {
  BillingInvoiceDetailResult,
  BillingInvoiceIssuerResult,
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

class BillingInvoiceIssuerDto implements BillingInvoiceIssuerResult {
  @ApiProperty({ nullable: true, type: String, example: 'CareProfs Medical Ltd' })
  companyName!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '12 Medical Road, Ikeja, Lagos, Nigeria' })
  companyAddress!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'First Bank' }) bankName!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '1029302910' })
  bankAccountNumber!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'CareProfs Medical Ltd' })
  bankAccountName!: string | null;
}

/** The single invoice detail (the Overview tab). */
export class BillingInvoiceDetailResponseDto implements BillingInvoiceDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-451' }) number!: string;
  @ApiProperty({
    enum: ['DRAFT', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'CANCELLED'],
  })
  status!: InvoiceListStatus;
  @ApiProperty({ nullable: true, type: String }) billingAccountId!: string | null;
  @ApiProperty({ nullable: true, type: String }) billingAccountName!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '24 Gbagada Expressway, Gbagada, Lagos' })
  billingAddress!: string | null;
  @ApiProperty() careRecipientName!: string;
  @ApiProperty({ nullable: true, type: String }) careRecipientPhotoKey!: string | null;
  @ApiProperty() invoiceDate!: string;
  @ApiProperty({ nullable: true, type: String }) dueDate!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'Net 30' }) paymentTerms!: string | null;
  @ApiProperty() servicePeriodStart!: string;
  @ApiProperty() servicePeriodEnd!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ example: 145_000_000 }) subtotalMinor!: number;
  @ApiProperty({ example: 7_793_700 }) discountTotalMinor!: number;
  @ApiProperty({ example: 10_875_000 }) taxMinor!: number;
  @ApiProperty({ example: 7.5 }) taxRatePercent!: number;
  @ApiProperty() totalAmountMinor!: number;
  @ApiProperty() insuranceCoveredMinor!: number;
  @ApiProperty() amountPaidMinor!: number;
  @ApiProperty() balanceDueMinor!: number;
  @ApiProperty({ minimum: 0, maximum: 100 }) percentPaid!: number;
  @ApiProperty({ type: [BillingInvoiceLineDto] }) lineItems!: BillingInvoiceLineDto[];
  @ApiProperty({ type: BillingInvoiceIssuerDto }) issuer!: BillingInvoiceIssuerDto;

  static fromResult(result: BillingInvoiceDetailResult): BillingInvoiceDetailResponseDto {
    return result;
  }
}
