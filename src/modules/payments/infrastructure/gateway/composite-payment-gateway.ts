import { Injectable } from '@nestjs/common';
import {
  CardSetupInitialization,
  InitializePaymentParams,
  InitializeSubscriptionParams,
  PaymentGateway,
  PaymentInitialization,
  PaymentVerification,
  SavedCard,
  StartCardSetupParams,
  WebhookPaymentEvent,
} from '../../application/ports/payment-gateway.port';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaystackPaymentGateway } from './paystack-payment-gateway';
import { ProviderGateway } from './provider-gateway';
import { StripePaymentGateway } from './stripe-payment-gateway';

/**
 * The PaymentGateway port implementation. Holds one adapter per provider and
 * dispatches each call to the right one, so the application layer stays provider
 * agnostic while each provider keeps its own concrete integration.
 */
@Injectable()
export class CompositePaymentGateway implements PaymentGateway {
  private readonly providers: Record<PaymentProvider, ProviderGateway>;

  constructor(stripe: StripePaymentGateway, paystack: PaystackPaymentGateway) {
    this.providers = {
      [PaymentProvider.Stripe]: stripe,
      [PaymentProvider.Paystack]: paystack,
    };
  }

  initialize(params: InitializePaymentParams): Promise<PaymentInitialization> {
    return this.providers[params.provider].initialize({
      amount: params.amount,
      reference: params.reference,
      ownerEmail: params.ownerEmail,
      metadata: params.metadata,
    });
  }

  initializeSubscription(params: InitializeSubscriptionParams): Promise<PaymentInitialization> {
    return this.providers[params.provider].initializeSubscription({
      planReference: params.planReference,
      amount: params.amount,
      reference: params.reference,
      ownerEmail: params.ownerEmail,
      metadata: params.metadata,
    });
  }

  startCardSetup(params: StartCardSetupParams): Promise<CardSetupInitialization> {
    return this.providers[params.provider].startCardSetup({
      ownerId: params.ownerId,
      ownerEmail: params.ownerEmail,
      reference: params.reference,
      customerRef: params.customerRef,
    });
  }

  retrieveSavedCard(provider: PaymentProvider, providerReference: string): Promise<SavedCard> {
    return this.providers[provider].retrieveSavedCard(providerReference);
  }

  verify(provider: PaymentProvider, providerReference: string): Promise<PaymentVerification> {
    return this.providers[provider].verify(providerReference);
  }

  parseWebhook(provider: PaymentProvider, rawBody: string, signature: string): WebhookPaymentEvent {
    return this.providers[provider].parseWebhook(rawBody, signature);
  }
}
