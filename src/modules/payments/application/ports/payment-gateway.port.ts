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

export interface WebhookPaymentEvent {
  providerReference: string;
  outcome: GatewayOutcome;
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
  verify(provider: PaymentProvider, providerReference: string): Promise<PaymentVerification>;
  /** Verify the webhook signature and parse it, or throw if the signature is invalid. */
  parseWebhook(provider: PaymentProvider, rawBody: string, signature: string): WebhookPaymentEvent;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
