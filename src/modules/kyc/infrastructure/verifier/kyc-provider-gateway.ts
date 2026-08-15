import {
  KycVerificationOutcome,
  KycVerificationRequest,
} from '../../application/ports/kyc-verifier.port';

/** One provider's implementation of the verification call. */
export interface KycProviderGateway {
  verify(request: KycVerificationRequest): Promise<KycVerificationOutcome>;
}
