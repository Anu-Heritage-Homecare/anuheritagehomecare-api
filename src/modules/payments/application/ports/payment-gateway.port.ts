import { Money } from '@shared/domain/money.vo';
import { PaymentProvider } from '../../domain/payment-provider.enum';

export type GatewayOutcome = 'succeeded' | 'failed' | 'pending';

export interface InitializePaymentParams {
  provider: PaymentProvider;
  amount: Money;
  /** Our own opaque reference, echoed back by the provider for reconciliation. */
  reference: string;
  ownerEmail: string;
  metadata: Record<string, string>;
}

export interface InitializeSubscriptionParams {
  provider: PaymentProvider;
  /** The recurring price (Stripe) or plan code (Paystack) at the provider. */
  planReference: string;
  amount: Money;
  reference: string;
  ownerEmail: string;
  metadata: Record<string, string>;
}

export interface PaymentInitialization {
  /** The provider's own transaction or intent identifier. */
  providerReference: string;
  /** Stripe: the PaymentIntent client secret the app confirms with. */
  clientSecret?: string;
  /** Paystack: the hosted checkout URL the app redirects to. */
  authorizationUrl?: string;
}

export interface PaymentVerification {
  outcome: GatewayOutcome;
  amountMinor: number;
  currency: string;
}

export interface StartCardSetupParams {
  provider: PaymentProvider;
  /** The owner adding the card; echoed in provider metadata to bind it back. */
  ownerId: string;
  ownerEmail: string;
  /** Our own opaque reference, echoed by the provider for reconciliation. */
  reference: string;
  /** Reuse an existing provider customer (Stripe) if the owner already has one. */
  customerRef: string | null;
}

export interface CardSetupInitialization {
  /** The handle the client echoes back to confirm (Stripe SetupIntent id / Paystack reference). */
  providerReference: string;
  /** The provider customer the card is attached to, persisted for reuse. */
  providerCustomerRef: string | null;
  /** Stripe: the SetupIntent client secret the app confirms the card with. */
  clientSecret?: string;
  /** Paystack: the hosted page URL where the user enters the card. */
  authorizationUrl?: string;
}

/**
 * A card tokenised by the provider, ready to persist. The raw card never reaches
 * this service; only an opaque provider reference plus display metadata.
 */
export interface SavedCard {
  /** The owner id the provider echoes from the metadata we set, for binding. */
  ownerRef: string;
  providerCustomerRef: string | null;
  providerMethodRef: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface WebhookPaymentEvent {
  providerReference: string;
  outcome: GatewayOutcome;
}

export interface ChangeSubscriptionPlanParams {
  provider: PaymentProvider;
  /** The provider's own subscription identifier (stored on the initiating payment). */
  providerSubscriptionRef: string;
  /** The new recurring price (Stripe) or plan code (Paystack) at the provider. */
  newPlanReference: string;
}

/**
 * Provider agnostic port over a payment gateway. Implemented per provider and
 * dispatched by the provider on each call, so the application layer never depends
 * on Stripe or Paystack directly.
 */
export interface PaymentGateway {
  initialize(params: InitializePaymentParams): Promise<PaymentInitialization>;
  /** Start a recurring subscription and collect its first payment. */
  initializeSubscription(params: InitializeSubscriptionParams): Promise<PaymentInitialization>;
  /** Begin saving a card: create the provider setup and return its client handle. */
  startCardSetup(params: StartCardSetupParams): Promise<CardSetupInitialization>;
  /** Read back the tokenised card once the client has completed the setup. */
  retrieveSavedCard(provider: PaymentProvider, providerReference: string): Promise<SavedCard>;
  /** Move an existing provider subscription onto a different recurring plan. */
  changeSubscriptionPlan(params: ChangeSubscriptionPlanParams): Promise<void>;
  verify(provider: PaymentProvider, providerReference: string): Promise<PaymentVerification>;
  /** Verify the webhook signature and parse it, or throw if the signature is invalid. */
  parseWebhook(provider: PaymentProvider, rawBody: string, signature: string): WebhookPaymentEvent;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
