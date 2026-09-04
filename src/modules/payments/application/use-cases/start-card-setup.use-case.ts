import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from '../../domain/payment-method.repository';
import { providerForCurrency } from '../../domain/payment-provider.enum';
import { CardSetupInitiationResult } from '../dto/card-setup.result';
import { PAYMENT_GATEWAY, PaymentGateway } from '../ports/payment-gateway.port';

export interface StartCardSetupCommand {
  ownerId: string;
  ownerEmail: string;
  /** The owner's market country code, deciding the provider (never the client). */
  country: string;
}

/**
 * Use case: begin adding a saved card. The provider is chosen server side from the
 * owner's market, an existing provider customer is reused when the owner already
 * has one, and the gateway returns the client handle the app completes the card
 * entry with. No card data touches this service.
 */
@Injectable()
export class StartCardSetupUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: StartCardSetupCommand): Promise<CardSetupInitiationResult> {
    const provider = providerForCurrency(currencyForCountryCode(command.country));

    const existing = await this.methods.listByOwner(command.ownerId);
    const customerRef =
      existing.find((method) => method.provider === provider && method.providerCustomerRef !== null)
        ?.providerCustomerRef ?? null;

    const reference = this.ids.generate();
    const initialization = await this.gateway.startCardSetup({
      provider,
      ownerId: command.ownerId,
      ownerEmail: command.ownerEmail,
      reference,
      customerRef,
    });

    return {
      provider,
      reference: initialization.providerReference,
      clientSecret: initialization.clientSecret ?? null,
      authorizationUrl: initialization.authorizationUrl ?? null,
    };
  }
}
