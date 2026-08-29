import { ApiProperty } from '@nestjs/swagger';
import { PaymentInitiationResult } from '@modules/payments/application/dto/payment.result';
import {
  BillingDashboardResult,
  InvoiceDetailResult,
  InvoiceSummaryResult,
  ReceiptResult,
} from '../../application/dto/billing.result';

class BillingPlanDto {
  @ApiProperty({ example: 'Premium Home Care' })
  planName!: string;

  @ApiProperty({ example: 'PREMIUM' })
  planType!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: 18900000, description: 'Monthly price in integer minor units' })
  monthlyPriceMinor!: number;

  @ApiProperty({ example: '2026-08-15' })
  nextPaymentDate!: string;

  @ApiProperty({ example: true, description: 'Recurring billing is handled by the provider' })
  autoPay!: boolean;
}

class BillingSummaryDto {
  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: 8900000 })
  paidThisMonthMinor!: number;

  @ApiProperty({ example: 5000000 })
  upcomingPaymentMinor!: number;

  @ApiProperty({ nullable: true, example: '2026-08-15' })
  upcomingPaymentDate!: string | null;
}

/** The family billing dashboard. */
export class BillingDashboardResponseDto {
  @ApiProperty({ type: BillingPlanDto, nullable: true })
  plan!: BillingPlanDto | null;

  @ApiProperty({ type: BillingSummaryDto })
  summary!: BillingSummaryDto;

  static fromResult(result: BillingDashboardResult): BillingDashboardResponseDto {
    const dto = new BillingDashboardResponseDto();
    dto.plan = result.plan === null ? null : { ...result.plan };
    dto.summary = { ...result.summary };
    return dto;
  }
}

/** One invoice in the billing history. */
export class InvoiceSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INV-202608-1a2b3c4d' })
  number!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: 18900000 })
  amountMinor!: number;

  @ApiProperty({ enum: ['ISSUED', 'PAID', 'VOID'] })
  status!: string;

  @ApiProperty({ example: '2026-08-01' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-31' })
  periodEnd!: string;

  @ApiProperty({ example: '2026-08-01' })
  dueDate!: string;

  static fromResult(result: InvoiceSummaryResult): InvoiceSummaryResponseDto {
    return Object.assign(new InvoiceSummaryResponseDto(), result);
  }
}

/** One invoice in full. */
export class InvoiceDetailResponseDto extends InvoiceSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  careRecipientId!: string;

  @ApiProperty({ format: 'uuid' })
  subscriptionId!: string;

  @ApiProperty()
  issuedAt!: string;

  @ApiProperty({ nullable: true })
  paidAt!: string | null;

  static fromDetail(result: InvoiceDetailResult): InvoiceDetailResponseDto {
    return Object.assign(new InvoiceDetailResponseDto(), result);
  }
}

/** What the client needs to complete an invoice payment. */
export class PayInvoiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ example: 'PAYSTACK' })
  provider!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: 18900000 })
  amountMinor!: number;

  @ApiProperty({ nullable: true, description: 'Stripe: confirm the intent with this secret' })
  clientSecret!: string | null;

  @ApiProperty({ nullable: true, description: 'Paystack: redirect to this checkout URL' })
  authorizationUrl!: string | null;

  static fromResult(result: PaymentInitiationResult): PayInvoiceResponseDto {
    const dto = new PayInvoiceResponseDto();
    dto.paymentId = result.paymentId;
    dto.provider = String(result.provider);
    dto.status = String(result.status);
    dto.currency = String(result.currency);
    dto.amountMinor = result.amountMinor;
    dto.clientSecret = result.clientSecret;
    dto.authorizationUrl = result.authorizationUrl;
    return dto;
  }
}

/** A receipt for a settled payment. */
export class ReceiptResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: 8900000 })
  amountMinor!: number;

  @ApiProperty({ example: 'PAYSTACK' })
  provider!: string;

  @ApiProperty({ description: "The provider's charge reference" })
  reference!: string;

  @ApiProperty({ enum: ['BOOKING', 'SUBSCRIPTION'] })
  forType!: string;

  @ApiProperty({ description: 'When the charge settled (ISO 8601)' })
  paidAt!: string;

  static fromResult(result: ReceiptResult): ReceiptResponseDto {
    return Object.assign(new ReceiptResponseDto(), result);
  }
}
