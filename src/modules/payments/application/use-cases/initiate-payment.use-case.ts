import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { Payment } from '../../domain/payment.entity';
import { providerForCurrency } from '../../domain/payment-provider.enum';
import { PAYMENT_REPOSITORY, PaymentRepository } from '../../domain/payment.repository';
import { InitiatePaymentCommand } from '../commands/initiate-payment.command';
import { PaymentInitiationResult } from '../dto/payment.result';
import { PAYABLE_SERVICE, PayableService } from '../ports/payable-service.port';
import { PAYMENT_GATEWAY, PaymentGateway } from '../ports/payment-gateway.port';

/**
 * Use case: begin paying for a booking or subscription. The amount and currency
 * are read from the payable (never the client), the provider is chosen by
 * currency, the gateway is asked to start the charge, and a pending Payment is
 * recorded. The client completes the charge with the returned secret or URL; the
 * booking is only confirmed once the provider reports success.
 */
@Injectable()
export class InitiatePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYABLE_SERVICE) private readonly payables: PayableService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: InitiatePaymentCommand): Promise<PaymentInitiationResult> {
    const payable = await this.payables.load(command.payableType, command.payableId);
    if (payable === null || payable.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Nothing to pay for was found');
    }
    if (payable.alreadyPaid) {
      throw new ValidationException('This has already been paid for');
    }

    const amount = Money.fromMinor(payable.amountMinor, payable.currency);
    const provider = providerForCurrency(payable.currency);
    const paymentId = this.ids.generate();

    const initialization = await this.gateway.initialize({
      provider,
      amount,
      reference: paymentId,
      ownerEmail: command.ownerEmail,
      metadata: {
        paymentId,
        ownerId: command.ownerId,
        payableType: command.payableType,
        payableId: command.payableId,
      },
    });

    const payment = Payment.initiate({
      id: paymentId,
      ownerId: command.ownerId,
      payableType: command.payableType,
      payableId: command.payableId,
      provider,
      providerReference: initialization.providerReference,
      amount,
      now: this.clock.now(),
    });
    await this.payments.save(payment);

    return {
      paymentId: payment.id,
      provider,
      status: payment.status,
      currency: payable.currency,
      amountMinor: amount.amountMinor,
      clientSecret: initialization.clientSecret ?? null,
      authorizationUrl: initialization.authorizationUrl ?? null,
    };
  }
}
