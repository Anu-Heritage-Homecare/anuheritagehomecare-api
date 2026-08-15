import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentConfig } from '@config/configuration';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  GatewayOutcome,
  PaymentInitialization,
  PaymentVerification,
  WebhookPaymentEvent,
} from '../../application/ports/payment-gateway.port';
import { ProviderGateway, ProviderInitializeParams } from './provider-gateway';

const STRIPE_API = 'https://api.stripe.com/v1';

interface StripeIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Stripe adapter (USD). Creates and verifies PaymentIntents over the Stripe REST
 * API and verifies webhook signatures. Fails closed if the secret key is not
 * configured. NOTE: written against the Stripe API but not yet verified end to
 * end against a live account.
 */
@Injectable()
export class StripePaymentGateway implements ProviderGateway {
  private readonly config: PaymentConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<PaymentConfig>('payment');
  }

  private secret(): string {
    if (this.config.stripeSecretKey.length === 0) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY is empty)');
    }
    return this.config.stripeSecretKey;
  }

  async initialize(params: ProviderInitializeParams): Promise<PaymentInitialization> {
    const body = new URLSearchParams();
    body.set('amount', String(params.amount.amountMinor));
    body.set('currency', params.amount.currency.toLowerCase());
    body.set('automatic_payment_methods[enabled]', 'true');
    body.set('metadata[reference]', params.reference);
    body.set('receipt_email', params.ownerEmail);
    for (const [key, value] of Object.entries(params.metadata)) {
      body.set(`metadata[${key}]`, value);
    }

    const intent = await this.call<StripeIntent>('POST', '/payment_intents', body);
    return { providerReference: intent.id, clientSecret: intent.client_secret };
  }

  async verify(providerReference: string): Promise<PaymentVerification> {
    const intent = await this.call<StripeIntent>(
      'GET',
      `/payment_intents/${encodeURIComponent(providerReference)}`,
    );
    return {
      outcome: StripePaymentGateway.toOutcome(intent.status),
      amountMinor: intent.amount,
      currency: intent.currency.toUpperCase(),
    };
  }

  parseWebhook(rawBody: string, signature: string): WebhookPaymentEvent {
    if (this.config.stripeWebhookSecret.length === 0) {
      throw new Error('Stripe webhook secret is not configured');
    }
    this.assertSignature(rawBody, signature);

    const event = JSON.parse(rawBody) as {
      type: string;
      data: { object: { id: string } };
    };
    const providerReference = event.data.object.id;
    if (event.type === 'payment_intent.succeeded') {
      return { providerReference, outcome: 'succeeded' };
    }
    if (event.type === 'payment_intent.payment_failed') {
      return { providerReference, outcome: 'failed' };
    }
    return { providerReference, outcome: 'pending' };
  }

  private assertSignature(rawBody: string, signature: string): void {
    // Stripe-Signature: t=timestamp,v1=hexsig
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
    const expected = createHmac('sha256', this.config.stripeWebhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    if (!StripePaymentGateway.safeEqual(expected, provided)) {
      throw new Error('Invalid Stripe webhook signature');
    }
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: URLSearchParams): Promise<T> {
    const response = await fetch(`${STRIPE_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secret()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body?.toString(),
    });
    if (!response.ok) {
      throw new Error(`Stripe request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private static toOutcome(status: string): GatewayOutcome {
    if (status === 'succeeded') {
      return 'succeeded';
    }
    if (status === 'canceled' || status === 'requires_payment_method') {
      return 'failed';
    }
    return 'pending';
  }

  private static safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
  }
}
