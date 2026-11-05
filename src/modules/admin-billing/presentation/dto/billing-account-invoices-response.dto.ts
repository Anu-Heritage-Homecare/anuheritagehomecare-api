import { ApiProperty } from '@nestjs/swagger';
import { InvoiceDisplayStatus } from '../../application/ports/billing-accounts-read.port';
import {
  BillingAccountInvoiceRowResult,
  BillingAccountInvoicesResult,
} from '../../application/dto/billing-account-invoices.result';

class BillingAccountInvoiceRowDto implements BillingAccountInvoiceRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-042' }) number!: string;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) dueDate!: string | null;
  @ApiProperty() paidAmountMinor!: number;
  @ApiProperty({ enum: ['PAID', 'AWAITING_PAYMENT', 'OVERDUE'] })
  status!: InvoiceDisplayStatus;
}

/** The Invoices tab of a billing account. */
export class BillingAccountInvoicesResponseDto implements BillingAccountInvoicesResult {
  @ApiProperty({ type: [BillingAccountInvoiceRowDto] })
  invoices!: BillingAccountInvoiceRowDto[];
  @ApiProperty() total!: number;

  static fromResult(result: BillingAccountInvoicesResult): BillingAccountInvoicesResponseDto {
    return result;
  }
}
