import { KycProvider } from '../../domain/kyc-provider.enum';

export type KycWebhookOutcome = 'verified' | 'failed' | 'pending';

export interface KycWebhookEvent {
  providerReference: string;
  outcome: KycWebhookOutcome;
}

/**
 * Port over a provider's identity webhook. Only asynchronous providers (Stripe
 * Identity) send these; synchronous providers (QoreID) do not. Verifies the
 * signature and parses the event, or throws when the signature is invalid.
 */
export interface KycWebhookGateway {
  parse(provider: KycProvider, rawBody: string, signature: string): KycWebhookEvent;
}

export const KYC_WEBHOOK_GATEWAY = Symbol('KYC_WEBHOOK_GATEWAY');
