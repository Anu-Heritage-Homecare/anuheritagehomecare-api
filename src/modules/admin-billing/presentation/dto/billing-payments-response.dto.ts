import { ApiProperty } from '@nestjs/swagger';
import {
  BillingPaymentRowResult,
  BillingPaymentsListResult,
} from '../../application/dto/billing-payments.result';
import {
  PaymentListCounts,
  PaymentListStatus,
} from '../../application/ports/billing-payments-read.port';

class PaymentListCountsDto implements PaymentListCounts {
  @ApiProperty() all!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() completed!: number;
  @ApiProperty() failed!: number;
  @ApiProperty() refunded!: number;
}

class BillingPaymentRowDto implements BillingPaymentRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'TXN-0812' }) reference!: string;
  @ApiProperty({ nullable: true, type: String, example: 'INV-2026-451' })
  invoiceNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) billingAccountId!: string | null;
  @ApiProperty({ nullable: true, type: String }) billingAccountName!: string | null;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ description: 'Cumulative amount already refunded (0 when none)' })
  refundedAmountMinor!: number;
  @ApiProperty({ description: 'Still refundable (amount minus refunded); 0 for non refundable' })
  refundableRemainingMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) method!: string | null;
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] })
  status!: PaymentListStatus;
}

/** The org wide Payments list. */
export class BillingPaymentsResponseDto implements BillingPaymentsListResult {
  @ApiProperty({ type: [BillingPaymentRowDto] }) payments!: BillingPaymentRowDto[];
  @ApiProperty({ type: PaymentListCountsDto }) tabs!: PaymentListCountsDto;
  @ApiProperty({ type: [String] }) methods!: string[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;

  static fromResult(result: BillingPaymentsListResult): BillingPaymentsResponseDto {
    return result;
  }
}
