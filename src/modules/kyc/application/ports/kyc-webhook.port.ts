import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { ProviderIdentity } from '../../domain/identity-matcher';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycProvider } from '../../domain/kyc-provider.enum';

export type KycWebhookState = 'verified' | 'failed' | 'pending';

/**
 * A parsed identity webhook. On a verified event the provider (Stripe Identity)
 * has extracted the document holder's identity and matched their selfie, so the
 * event carries that data for the application to compare against the claimed
 * details before deciding to verify or reject.
 */
export interface KycWebhookEvent {
  providerReference: string;
  state: KycWebhookState;
  identity?: ProviderIdentity | null;
  faceMatch?: FaceMatchOutcome | null;
  documentType?: KycDocumentType | null;
  maskedReference?: string | null;
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
