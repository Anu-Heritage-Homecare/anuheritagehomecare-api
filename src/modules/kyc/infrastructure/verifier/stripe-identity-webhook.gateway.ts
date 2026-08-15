import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycConfig } from '@config/configuration';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { KycWebhookEvent, KycWebhookGateway } from '../../application/ports/kyc-webhook.port';
import { KycProvider } from '../../domain/kyc-provider.enum';

/**
 * Verifies and parses Stripe Identity webhooks, completing the asynchronous US
 * verification. QoreID is synchronous and sends no webhooks, so it is rejected.
 * Fails closed when the Identity webhook secret is not configured.
 */
@Injectable()
export class StripeIdentityWebhookGateway implements KycWebhookGateway {
  private readonly config: KycConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<KycConfig>('kyc');
  }

  parse(provider: KycProvider, rawBody: string, signature: string): KycWebhookEvent {
    if (provider !== KycProvider.Stripe) {
      throw new Error(`No webhook is expected from ${provider}`);
    }
    if (this.config.stripeIdentityWebhookSecret.length === 0) {
      throw new Error('Stripe Identity webhook secret is not configured');
    }
    this.assertSignature(rawBody, signature);

    const event = JSON.parse(rawBody) as {
      type: string;
      data: { object: { id: string } };
    };
    const providerReference = event.data.object.id;
    if (event.type === 'identity.verification_session.verified') {
      return { providerReference, outcome: 'verified' };
    }
    if (
      event.type === 'identity.verification_session.requires_input' ||
      event.type === 'identity.verification_session.canceled'
    ) {
      return { providerReference, outcome: 'failed' };
    }
    return { providerReference, outcome: 'pending' };
  }

  private assertSignature(rawBody: string, signature: string): void {
    const parts = new Map(
      signature.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key, value] as const;
      }),
    );
    const timestamp = parts.get('t');
    const provided = parts.get('v1');
    if (timestamp === undefined || provided === undefined) {
      throw new Error('Malformed Stripe signature header');
    }
    const expected = createHmac('sha256', this.config.stripeIdentityWebhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new Error('Invalid Stripe Identity webhook signature');
    }
  }
}
