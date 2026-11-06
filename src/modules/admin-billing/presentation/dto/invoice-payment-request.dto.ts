import { ApiProperty } from '@nestjs/swagger';
import { RequestInvoiceOnlinePaymentResult } from '../../application/use-cases/request-invoice-online-payment.use-case';

/** A started online payment for an invoice: the hosted link or client secret. */
export class InvoicePaymentRequestResponseDto implements RequestInvoiceOnlinePaymentResult {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ example: 'PAYSTACK' })
  provider!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amountMinor!: number;

  @ApiProperty({ nullable: true, type: String, description: 'Stripe PaymentIntent client secret' })
  clientSecret!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Paystack hosted checkout URL' })
  authorizationUrl!: string | null;

  static fromResult(result: RequestInvoiceOnlinePaymentResult): InvoicePaymentRequestResponseDto {
    return result;
  }
}
