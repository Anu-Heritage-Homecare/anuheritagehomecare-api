import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import { PaymentMethod } from '../../domain/payment-method.entity';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from '../../domain/payment-method.repository';
import { providerForCurrency } from '../../domain/payment-provider.enum';
import { PaymentMethodResult, toPaymentMethodResult } from '../dto/payment-method.result';
import { PAYMENT_GATEWAY, PaymentGateway } from '../ports/payment-gateway.port';

export interface AddPaymentMethodCommand {
  ownerId: string;
  country: string;
  /** The setup handle returned by the start step and completed by the client. */
  reference: string;
}

/**
 * Use case: finish adding a card. The gateway reads the card the client tokenised
 * at the provider; the card is bound to the caller (the provider echoes the owner
 * id we set, and it must match), then persisted with only its display metadata.
 * Retrying with the same card is idempotent, and the owner's first card becomes
 * their default.
 */
@Injectable()
export class AddPaymentMethodUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddPaymentMethodCommand): Promise<PaymentMethodResult> {
    const provider = providerForCurrency(currencyForCountryCode(command.country));
    const card = await this.gateway.retrieveSavedCard(provider, command.reference);
    if (card.ownerRef !== command.ownerId) {
      throw new NotFoundDomainException('Card setup not found');
    }

    const existing = await this.methods.listByOwner(command.ownerId);
    const alreadySaved = existing.find(
      (method) => method.providerMethodRef === card.providerMethodRef,
    );
    if (alreadySaved !== undefined) {
      return toPaymentMethodResult(alreadySaved);
    }

    const method = PaymentMethod.register(this.ids.generate(), {
      ownerId: command.ownerId,
      provider,
      providerCustomerRef: card.providerCustomerRef,
      providerMethodRef: card.providerMethodRef,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: existing.length === 0,
      createdAt: this.clock.now(),
    });
    await this.methods.save(method);

    return toPaymentMethodResult(method);
  }
}
