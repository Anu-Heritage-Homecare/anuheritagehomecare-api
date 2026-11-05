import { ApiProperty } from '@nestjs/swagger';
import { PaymentDisplayStatus } from '../../application/dto/billing-account-payments.result';
import {
  InvoicePaymentRowResult,
  InvoicePaymentsResult,
} from '../../application/dto/billing-invoice-payments.result';

class InvoicePaymentRowDto implements InvoicePaymentRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'TXN-84729103' }) reference!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) method!: string | null;
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ enum: ['COMPLETED'] }) status!: PaymentDisplayStatus;
}

/** The invoice Payments tab. An empty list renders the "No payments recorded" state. */
export class BillingInvoicePaymentsResponseDto implements InvoicePaymentsResult {
  @ApiProperty({ type: [InvoicePaymentRowDto] }) payments!: InvoicePaymentRowDto[];
  @ApiProperty() total!: number;

  static fromResult(result: InvoicePaymentsResult): BillingInvoicePaymentsResponseDto {
    return result;
  }
}
