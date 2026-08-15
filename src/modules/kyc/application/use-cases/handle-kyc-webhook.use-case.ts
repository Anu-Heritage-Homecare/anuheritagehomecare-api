import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { KycProvider } from '../../domain/kyc-provider.enum';
import {
  KYC_VERIFICATION_REPOSITORY,
  KycVerificationRepository,
} from '../../domain/kyc-verification.repository';
import { KYC_WEBHOOK_GATEWAY, KycWebhookGateway } from '../ports/kyc-webhook.port';

/**
 * Use case: complete an asynchronous KYC (Stripe Identity) from a signed webhook.
 * The signature is verified inside the gateway; an unknown reference is ignored.
 * The verification is matched by its provider reference and marked verified or
 * failed. Idempotent, since providers retry.
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

    if (event.outcome === 'verified') {
      verification.markVerified(this.clock.now());
      await this.repository.save(verification);
      return;
    }
    if (event.outcome === 'failed') {
      verification.markFailed(this.clock.now());
      await this.repository.save(verification);
    }
  }
}
