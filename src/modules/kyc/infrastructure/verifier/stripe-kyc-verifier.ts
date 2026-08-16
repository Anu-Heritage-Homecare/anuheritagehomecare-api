import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentConfig } from '@config/configuration';
import {
  KycVerificationOutcome,
  KycVerificationRequest,
} from '../../application/ports/kyc-verifier.port';
import { KycProviderGateway } from './kyc-provider-gateway';

const STRIPE_API = 'https://api.stripe.com/v1';

interface StripeVerificationSession {
  id: string;
  client_secret?: string;
}

/**
 * Stripe KYC adapter (US). Opens a Stripe Identity verification session that
 * requires a document and a matching selfie, so Stripe extracts the ID data,
 * matches the live selfie to the photo on the document and checks liveness. The
 * session is completed asynchronously, so this returns pending plus the client
 * secret the frontend SDK needs; a signed Stripe webhook finalises the outcome.
 * Reuses the Stripe secret key and fails closed when it is not configured. NOTE:
 * written against the Stripe API but not yet verified against a live account.
 */
@Injectable()
export class StripeKycVerifier implements KycProviderGateway {
  private readonly payment: PaymentConfig;

  constructor(config: ConfigService) {
    this.payment = config.getOrThrow<PaymentConfig>('payment');
  }

  async verify(request: KycVerificationRequest): Promise<KycVerificationOutcome> {
    if (this.payment.stripeSecretKey.length === 0) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY is empty)');
    }

    const body = new URLSearchParams();
    body.set('type', 'document');
    body.set('options[document][require_matching_selfie]', 'true');
    body.set('options[document][require_live_capture]', 'true');
    body.set('provided_details[email]', '');
    body.set('metadata[firstName]', request.claimed.firstName);
    body.set('metadata[lastName]', request.claimed.lastName);

    const response = await fetch(`${STRIPE_API}/identity/verification_sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.payment.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Stripe Identity request failed with status ${response.status}`);
    }
    const session = (await response.json()) as StripeVerificationSession;
    return {
      state: 'pending',
      providerReference: session.id,
      clientSecret: session.client_secret ?? null,
    };
  }
}
