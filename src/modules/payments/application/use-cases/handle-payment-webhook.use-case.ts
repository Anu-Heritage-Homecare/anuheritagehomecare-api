import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PAYMENT_REPOSITORY, PaymentRepository } from '../../domain/payment.repository';
import { PAYABLE_SERVICE, PayableService } from '../ports/payable-service.port';
import { PAYMENT_GATEWAY, PaymentGateway } from '../ports/payment-gateway.port';

/**
 * Use case: process a provider webhook. The signature is verified inside the
 * gateway; an unknown reference is ignored. On the first success the payment is
 * marked succeeded and the payable is marked paid (confirming the booking or
 * activating the subscription). Processing is idempotent, since providers retry.
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYABLE_SERVICE) private readonly payables: PayableService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(params: {
    provider: PaymentProvider;
    rawBody: string;
    signature: string;
  }): Promise<void> {
    const event = this.gateway.parseWebhook(params.provider, params.rawBody, params.signature);

    const payment = await this.payments.findByProviderReference(event.providerReference);
    if (payment === null || payment.isSettled) {
      return;
    }

    if (event.outcome === 'succeeded') {
      payment.markSucceeded(this.clock.now());
      await this.payments.save(payment);
      await this.payables.markPaid(payment.payableType, payment.payableId);
      return;
    }

    if (event.outcome === 'failed') {
      payment.markFailed(this.clock.now());
      await this.payments.save(payment);
    }
  }
}
