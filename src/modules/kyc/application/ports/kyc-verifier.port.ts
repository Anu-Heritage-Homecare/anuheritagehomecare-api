import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { ClaimedIdentity, ProviderIdentity } from '../../domain/identity-matcher';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycProvider } from '../../domain/kyc-provider.enum';

export interface KycVerificationRequest {
  provider: KycProvider;
  country: string;
  /** The document holder's claimed details, for the provider and later comparison. */
  claimed: ClaimedIdentity;
  /** Chosen document (Nigeria/QoreID). Absent for the US, where Stripe detects it. */
  documentType?: KycDocumentType | null;
  /** The sensitive document number (Nigeria). Never logged. */
  idNumber?: string | null;
  /** The live selfie as base64 (Nigeria/QoreID). Never stored. */
  faceImageBase64?: string | null;
}

/**
 * What the provider did with the request. `completed` means it returned a result
 * synchronously (QoreID); `pending` means it opened an asynchronous session whose
 * result arrives by webhook (Stripe Identity); `not_found` means the document
 * itself could not be located.
 */
export type KycProviderState = 'completed' | 'pending' | 'not_found';

export interface KycVerificationOutcome {
  state: KycProviderState;
  providerReference: string | null;
  /** A client secret for the frontend to run the provider's SDK (Stripe Identity). */
  clientSecret?: string | null;
  /** The identity the provider returned for the document holder (QoreID). */
  identity?: ProviderIdentity | null;
  /** The provider's face match result, when it performs one. */
  faceMatch?: FaceMatchOutcome | null;
  /** The document type the provider verified, when it reports one. */
  documentType?: KycDocumentType | null;
  /** A masked remnant (last four) of the document number, when available. */
  maskedReference?: string | null;
}

/**
 * Provider agnostic port over an identity verification provider. Implemented per
 * provider (Stripe Identity, QoreID) and dispatched by the provider on each call.
 * The provider returns raw identity data and a face result; the decision to
 * verify or reject is made in the application layer, not by the provider.
 */
export interface KycVerifier {
  verify(request: KycVerificationRequest): Promise<KycVerificationOutcome>;
}

export const KYC_VERIFIER = Symbol('KYC_VERIFIER');
