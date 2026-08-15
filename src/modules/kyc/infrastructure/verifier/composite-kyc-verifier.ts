import { Injectable } from '@nestjs/common';
import {
  KycVerificationOutcome,
  KycVerificationRequest,
  KycVerifier,
} from '../../application/ports/kyc-verifier.port';
import { KycProvider } from '../../domain/kyc-provider.enum';
import { KycProviderGateway } from './kyc-provider-gateway';
import { QoreIdKycVerifier } from './qoreid-kyc-verifier';
import { StripeKycVerifier } from './stripe-kyc-verifier';

/**
 * The KycVerifier port implementation. Dispatches each request to the provider
 * for the owner's market, keeping the application layer provider agnostic.
 */
@Injectable()
export class CompositeKycVerifier implements KycVerifier {
  private readonly providers: Record<KycProvider, KycProviderGateway>;

  constructor(stripe: StripeKycVerifier, qoreId: QoreIdKycVerifier) {
    this.providers = {
      [KycProvider.Stripe]: stripe,
      [KycProvider.QoreId]: qoreId,
    };
  }

  verify(request: KycVerificationRequest): Promise<KycVerificationOutcome> {
    return this.providers[request.provider].verify(request);
  }
}
