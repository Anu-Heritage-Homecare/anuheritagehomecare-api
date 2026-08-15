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
  status: string;
}

/**
 * Stripe KYC adapter (US). Opens a Stripe Identity verification session and
 * returns it as pending; the session is completed asynchronously, so a Stripe
 * webhook finalising the outcome is a documented follow up. Reuses the Stripe
 * secret key and fails closed when it is not configured. NOTE: written against
 * the Stripe API but not yet verified against a live account.
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
    body.set('type', 'verification_flow');
    body.set('metadata[fullName]', request.fullName);
    body.set('metadata[documentType]', request.documentType);

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
    return { outcome: 'pending', providerReference: session.id };
  }
}
