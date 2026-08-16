import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { compareIdentity } from '../../domain/identity-matcher';
import { KycProvider } from '../../domain/kyc-provider.enum';
import {
  KYC_VERIFICATION_REPOSITORY,
  KycVerificationRepository,
} from '../../domain/kyc-verification.repository';
import { KYC_WEBHOOK_GATEWAY, KycWebhookGateway } from '../ports/kyc-webhook.port';

/**
 * Use case: complete an asynchronous KYC (Stripe Identity) from a signed webhook.
 *
 * On a verified event Stripe has matched the selfie to the document and extracted
 * the holder's identity. This compares that identity against the details the
 * owner claimed at submission: if they match the owner is verified, otherwise the
 * owner is rejected and the differences are stored for the admin audit. A
 * requires_input or canceled event fails the verification. Idempotent, since
 * providers retry; an unknown reference or an already verified owner is ignored.
 */
@Injectable()
export class HandleKycWebhookUseCase {
  constructor(
    @Inject(KYC_VERIFICATION_REPOSITORY) private readonly repository: KycVerificationRepository,
    @Inject(KYC_WEBHOOK_GATEWAY) private readonly gateway: KycWebhookGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(params: {
    provider: KycProvider;
    rawBody: string;
    signature: string;
  }): Promise<void> {
    const event = this.gateway.parse(params.provider, params.rawBody, params.signature);

    const verification = await this.repository.findByProviderReference(event.providerReference);
    if (verification === null || verification.isVerified) {
      return;
    }

    const now = this.clock.now();

    if (event.state === 'failed') {
      verification.markFailed(now);
      await this.repository.save(verification);
      return;
    }
    if (event.state !== 'verified') {
      return;
    }

    verification.recordVerifiedDocument(event.documentType ?? null, event.maskedReference ?? null);

    const mismatches = compareIdentity(verification.claimedIdentity, event.identity ?? {});
    const faceMatch = event.faceMatch ?? FaceMatchOutcome.Match;
    if (mismatches.length === 0) {
      verification.markVerified(now, faceMatch);
    } else {
      verification.markRejected(now, mismatches, faceMatch);
    }

    await this.repository.save(verification);
  }
}
