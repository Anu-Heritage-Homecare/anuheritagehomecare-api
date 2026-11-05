import { ApiProperty } from '@nestjs/swagger';
import {
  BillingAccountPaymentRowResult,
  BillingAccountPaymentsResult,
  PaymentDisplayStatus,
} from '../../application/dto/billing-account-payments.result';

class BillingAccountPaymentRowDto implements BillingAccountPaymentRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'TXN-84729103' }) reference!: string;
  @ApiProperty({ nullable: true, type: String, example: 'INV-2026-042' })
  invoiceNumber!: string | null;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) method!: string | null;
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ enum: ['COMPLETED'] }) status!: PaymentDisplayStatus;
}

/** The Payments tab of a billing account. */
export class BillingAccountPaymentsResponseDto implements BillingAccountPaymentsResult {
  @ApiProperty({ type: [BillingAccountPaymentRowDto] })
  payments!: BillingAccountPaymentRowDto[];
  @ApiProperty() total!: number;

  static fromResult(result: BillingAccountPaymentsResult): BillingAccountPaymentsResponseDto {
    return result;
  }
}
