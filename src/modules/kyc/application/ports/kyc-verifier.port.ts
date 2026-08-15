import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycProvider } from '../../domain/kyc-provider.enum';

export type KycOutcome = 'verified' | 'pending' | 'failed';

export interface KycVerificationRequest {
  provider: KycProvider;
  country: string;
  documentType: KycDocumentType;
  fullName: string;
  /** The sensitive value (SSN last four, NIN, or passport number). Never logged. */
  documentValue: string;
}

export interface KycVerificationOutcome {
  outcome: KycOutcome;
  providerReference: string | null;
}

/**
 * Provider agnostic port over an identity verification provider. Implemented per
 * provider (Stripe, QoreID) and dispatched by the provider on each call.
 */
export interface KycVerifier {
  verify(request: KycVerificationRequest): Promise<KycVerificationOutcome>;
}

export const KYC_VERIFIER = Symbol('KYC_VERIFIER');
