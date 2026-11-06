import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { PaymentDetailResult, PaymentHistoryEventResult } from '../dto/payment-detail.result';
import { ADMIN_DIRECTORY, AdminDirectory } from '../ports/admin-directory.port';
import {
  BILLING_PAYMENTS_READ_MODEL,
  BillingPaymentsReadModel,
  PaymentEventRowView,
} from '../ports/billing-payments-read.port';

const EVENT_TITLES: Record<PaymentEventRowView['type'], string> = {
  INITIATED: 'Payment Initiated',
  CONFIRMED: 'Payment Confirmed',
  RECEIPT_GENERATED: 'Receipt Generated',
  REFUNDED: 'Payment Refunded',
};

/** The Payment Details drawer: one recorded payment with its linked invoice and history. */
@Injectable()
export class GetPaymentDetailUseCase {
  constructor(
    @Inject(BILLING_PAYMENTS_READ_MODEL) private readonly reads: BillingPaymentsReadModel,
    @Inject(ADMIN_DIRECTORY) private readonly admins: AdminDirectory,
  ) {}

  async execute(paymentId: string): Promise<PaymentDetailResult> {
    const payment = await this.reads.detail(paymentId);
    if (payment === null) {
      throw new NotFoundDomainException('Payment not found');
    }

    const adminNames = await this.admins.names(payment.events.map((event) => event.actorAdminId));
    const history: PaymentHistoryEventResult[] = payment.events.map((event) => ({
      type: event.type,
      title: EVENT_TITLES[event.type],
      at: event.at.toISOString(),
      performedBy:
        event.actorType === 'ADMIN'
          ? event.actorAdminId === null
            ? null
            : (adminNames.get(event.actorAdminId) ?? null)
          : event.actorLabel,
      detail: event.detail,
    }));

    return {
      id: payment.id,
      reference: `PAY-${payment.receivedAt.getUTCFullYear()}-${String(payment.sequence).padStart(4, '0')}`,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      status: payment.refundedAt === null ? 'COMPLETED' : 'REFUNDED',
      method: payment.methodLabel,
      receivedAt: payment.receivedAt.toISOString(),
      referenceNumber: payment.referenceNumber,
      bankName: payment.bankName,
      notes: payment.notes,
      linkedInvoice:
        payment.invoiceSequence === null || payment.invoiceIssuedAt === null
          ? null
          : {
              number: `INV-${payment.invoiceIssuedAt.getUTCFullYear()}-${String(payment.invoiceSequence).padStart(3, '0')}`,
              accountName: payment.accountName,
              amountMinor: payment.invoiceAmountMinor ?? 0,
              status: payment.invoiceStatus ?? 'UNKNOWN',
            },
      history,
    };
  }
}
