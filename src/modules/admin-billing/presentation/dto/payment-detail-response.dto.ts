import { ApiProperty } from '@nestjs/swagger';
import {
  PaymentDetailResult,
  PaymentDetailStatus,
  PaymentHistoryEventResult,
  PaymentLinkedInvoiceResult,
} from '../../application/dto/payment-detail.result';

class PaymentLinkedInvoiceDto implements PaymentLinkedInvoiceResult {
  @ApiProperty({ example: 'INV-2026-451' }) number!: string;
  @ApiProperty({ nullable: true, type: String }) accountName!: string | null;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ example: 'PAID' }) status!: string;
}

class PaymentHistoryEventDto implements PaymentHistoryEventResult {
  @ApiProperty({ enum: ['INITIATED', 'CONFIRMED', 'RECEIPT_GENERATED', 'REFUNDED'] })
  type!: PaymentHistoryEventResult['type'];
  @ApiProperty({ example: 'Payment Confirmed' }) title!: string;
  @ApiProperty() at!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sarah Jenkins' })
  performedBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) detail!: string | null;
}

/** The Payment Details drawer: card, linked invoice, history and internal notes. */
export class PaymentDetailResponseDto implements PaymentDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'PAY-2026-0892' }) reference!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: ['COMPLETED', 'REFUNDED'] }) status!: PaymentDetailStatus;
  @ApiProperty({ nullable: true, type: String, example: 'Bank Transfer' }) method!: string | null;
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ nullable: true, type: String, example: 'TXN-1092309' })
  referenceNumber!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'First Bank' }) bankName!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ nullable: true, type: PaymentLinkedInvoiceDto })
  linkedInvoice!: PaymentLinkedInvoiceDto | null;
  @ApiProperty({ type: [PaymentHistoryEventDto] }) history!: PaymentHistoryEventDto[];

  static fromResult(result: PaymentDetailResult): PaymentDetailResponseDto {
    return result;
  }
}
