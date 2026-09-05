import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_REPOSITORY, PaymentRepository } from '@modules/payments/domain/payment.repository';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from '@modules/payments/domain/payment-method.repository';
import { PaymentStatus } from '@modules/payments/domain/payment-status.enum';
import { Payment } from '@modules/payments/domain/payment.entity';
import {
  BillingCardView,
  BillingPaymentDirectory,
  BillingPaymentView,
} from '../../application/ports/billing-directories.port';

/** Adapts the payments context to the billing payment port. */
@Injectable()
export class PaymentsBillingPaymentDirectory implements BillingPaymentDirectory {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository,
  ) {}

  async defaultCardForOwner(ownerId: string): Promise<BillingCardView | null> {
    const methods = await this.methods.listByOwner(ownerId);
    // listByOwner orders the default first, else fall back to the most recent.
    const card = methods.find((method) => method.isDefault) ?? methods[0] ?? null;
    return card === null ? null : { brand: card.brand, last4: card.last4 };
  }

  async listForOwner(ownerId: string): Promise<BillingPaymentView[]> {
    const payments = await this.payments.listByOwner(ownerId);
    return payments.map((payment) => PaymentsBillingPaymentDirectory.toView(payment));
  }

  async findForOwner(ownerId: string, paymentId: string): Promise<BillingPaymentView | null> {
    const payment = await this.payments.findById(paymentId);
    if (payment === null || payment.ownerId !== ownerId) {
      return null;
    }
    return PaymentsBillingPaymentDirectory.toView(payment);
  }

  private static toView(payment: Payment): BillingPaymentView {
    return {
      id: payment.id,
      currency: String(payment.amount.currency),
      amountMinor: payment.amount.amountMinor,
      provider: String(payment.provider),
      reference: payment.providerReference,
      payableType: String(payment.payableType),
      payableId: payment.payableId,
      succeeded: payment.status === PaymentStatus.Succeeded,
      createdAt: payment.createdAt,
    };
  }
}
