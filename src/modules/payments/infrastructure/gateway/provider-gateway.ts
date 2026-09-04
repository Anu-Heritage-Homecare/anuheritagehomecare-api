import { Money } from '@shared/domain/money.vo';
import {
  CardSetupInitialization,
  PaymentInitialization,
  PaymentVerification,
  SavedCard,
  WebhookPaymentEvent,
} from '../../application/ports/payment-gateway.port';

export interface ProviderInitializeParams {
  amount: Money;
  reference: string;
  ownerEmail: string;
  metadata: Record<string, string>;
}

export interface ProviderInitializeSubscriptionParams extends ProviderInitializeParams {
  planReference: string;
}

export interface ProviderStartCardSetupParams {
  ownerId: string;
  ownerEmail: string;
  reference: string;
  customerRef: string | null;
}

/**
 * A single provider's implementation of the gateway operations. The composite
 * gateway dispatches the port calls to the right one of these by provider.
 */
export interface ProviderGateway {
  initialize(params: ProviderInitializeParams): Promise<PaymentInitialization>;
  initializeSubscription(
    params: ProviderInitializeSubscriptionParams,
  ): Promise<PaymentInitialization>;
  startCardSetup(params: ProviderStartCardSetupParams): Promise<CardSetupInitialization>;
  retrieveSavedCard(providerReference: string): Promise<SavedCard>;
  verify(providerReference: string): Promise<PaymentVerification>;
  parseWebhook(rawBody: string, signature: string): WebhookPaymentEvent;
}
