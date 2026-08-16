import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycConfig } from '@config/configuration';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { ProviderIdentity } from '../../domain/identity-matcher';
import { KycWebhookEvent, KycWebhookGateway } from '../../application/ports/kyc-webhook.port';
import { KycProvider } from '../../domain/kyc-provider.enum';

interface StripeVerifiedOutputs {
  first_name?: string;
  last_name?: string;
  dob?: { day?: number; month?: number; year?: number };
  id_number?: string;
}

interface StripeIdentityEvent {
  type: string;
  data: { object: { id: string; verified_outputs?: StripeVerifiedOutputs } };
}

/**
 * Verifies and parses Stripe Identity webhooks, completing the asynchronous US
 * verification. On a verified event Stripe has matched the selfie to the document
 * and extracted the holder's identity, which this surfaces so the use case can
 * compare it against the claimed details. QoreID is synchronous and sends no
 * webhooks, so it is rejected. Fails closed when the webhook secret is not set.
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

    const event = JSON.parse(rawBody) as StripeIdentityEvent;
    const providerReference = event.data.object.id;

    if (event.type === 'identity.verification_session.verified') {
      const outputs = event.data.object.verified_outputs ?? {};
      return {
        providerReference,
        state: 'verified',
        identity: StripeIdentityWebhookGateway.toIdentity(outputs),
        faceMatch: FaceMatchOutcome.Match,
        documentType: null,
        maskedReference:
          outputs.id_number !== undefined && outputs.id_number.length >= 4
            ? outputs.id_number.slice(-4)
            : null,
      };
    }
    if (
      event.type === 'identity.verification_session.requires_input' ||
      event.type === 'identity.verification_session.canceled'
    ) {
      return { providerReference, state: 'failed' };
    }
    return { providerReference, state: 'pending' };
  }

  private static toIdentity(outputs: StripeVerifiedOutputs): ProviderIdentity {
    const dob = outputs.dob;
    const dateOfBirth =
      dob !== undefined &&
      dob.year !== undefined &&
      dob.month !== undefined &&
      dob.day !== undefined
        ? new Date(Date.UTC(dob.year, dob.month - 1, dob.day))
        : null;
    return {
      firstName: outputs.first_name ?? null,
      lastName: outputs.last_name ?? null,
      dateOfBirth,
    };
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
