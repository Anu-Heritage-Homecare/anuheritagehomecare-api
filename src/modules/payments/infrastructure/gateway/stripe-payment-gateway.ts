import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentConfig } from '@config/configuration';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CardSetupInitialization,
  GatewayOutcome,
  PaymentInitialization,
  PaymentVerification,
  SavedCard,
  WebhookPaymentEvent,
} from '../../application/ports/payment-gateway.port';
import {
  ProviderChangeSubscriptionPlanParams,
  ProviderGateway,
  ProviderInitializeParams,
  ProviderInitializeSubscriptionParams,
  ProviderStartCardSetupParams,
} from './provider-gateway';

const STRIPE_API = 'https://api.stripe.com/v1';

interface StripeIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

interface StripeCustomer {
  id: string;
}

interface StripeSubscription {
  id: string;
  latest_invoice: { payment_intent: { client_secret: string } };
}

interface StripeSetupIntent {
  id: string;
  client_secret: string;
  status: string;
  customer: string | null;
  metadata: Record<string, string>;
  payment_method: StripePaymentMethod | null;
}

interface StripePaymentMethod {
  id: string;
  card: { brand: string; last4: string; exp_month: number; exp_year: number };
}

interface StripeSubscriptionItems {
  items: { data: { id: string }[] };
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

  async initializeSubscription(
    params: ProviderInitializeSubscriptionParams,
  ): Promise<PaymentInitialization> {
    const customerForm = new URLSearchParams();
    customerForm.set('email', params.ownerEmail);
    const customer = await this.call<StripeCustomer>('POST', '/customers', customerForm);

    const body = new URLSearchParams();
    body.set('customer', customer.id);
    body.set('items[0][price]', params.planReference);
    body.set('payment_behavior', 'default_incomplete');
    body.set('expand[]', 'latest_invoice.payment_intent');
    body.set('metadata[reference]', params.reference);
    for (const [key, value] of Object.entries(params.metadata)) {
      body.set(`metadata[${key}]`, value);
    }

    const subscription = await this.call<StripeSubscription>('POST', '/subscriptions', body);
    return {
      providerReference: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    };
  }

  async startCardSetup(params: ProviderStartCardSetupParams): Promise<CardSetupInitialization> {
    const customerRef =
      params.customerRef ?? (await this.createCustomer(params.ownerId, params.ownerEmail));

    const body = new URLSearchParams();
    body.set('customer', customerRef);
    body.set('usage', 'off_session');
    body.set('metadata[ownerId]', params.ownerId);
    body.set('metadata[reference]', params.reference);

    const intent = await this.call<StripeSetupIntent>('POST', '/setup_intents', body);
    return {
      providerReference: intent.id,
      providerCustomerRef: customerRef,
      clientSecret: intent.client_secret,
    };
  }

  async retrieveSavedCard(providerReference: string): Promise<SavedCard> {
    const intent = await this.call<StripeSetupIntent>(
      'GET',
      `/setup_intents/${encodeURIComponent(providerReference)}?expand[]=payment_method`,
    );
    if (intent.status !== 'succeeded' || intent.payment_method === null) {
      throw new Error('Stripe card setup has not completed');
    }
    const card = intent.payment_method.card;
    return {
      ownerRef: intent.metadata.ownerId ?? '',
      providerCustomerRef: intent.customer,
      providerMethodRef: intent.payment_method.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
    };
  }

  async changeSubscriptionPlan(params: ProviderChangeSubscriptionPlanParams): Promise<void> {
    // Replace the subscription's single item with the new price, prorating the
    // difference so the customer is billed fairly for the mid cycle change.
    const subscription = await this.call<StripeSubscriptionItems>(
      'GET',
      `/subscriptions/${encodeURIComponent(params.providerSubscriptionRef)}`,
    );
    const itemId = subscription.items.data[0]?.id;
    if (itemId === undefined) {
      throw new Error('Stripe subscription has no item to change');
    }

    const body = new URLSearchParams();
    body.set('items[0][id]', itemId);
    body.set('items[0][price]', params.newPlanReference);
    body.set('proration_behavior', 'create_prorations');
    await this.call<StripeSubscription>(
      'POST',
      `/subscriptions/${encodeURIComponent(params.providerSubscriptionRef)}`,
      body,
    );
  }

  private async createCustomer(ownerId: string, email: string): Promise<string> {
    const form = new URLSearchParams();
    form.set('email', email);
    form.set('metadata[ownerId]', ownerId);
    const customer = await this.call<StripeCustomer>('POST', '/customers', form);
    return customer.id;
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
      data: { object: { id: string; subscription?: string } };
    };
    // For one time charges the reference is the PaymentIntent id; for
    // subscriptions the invoice carries the subscription id we stored.
    const object = event.data.object;
    const providerReference = object.subscription ?? object.id;

    if (event.type === 'payment_intent.succeeded' || event.type === 'invoice.payment_succeeded') {
      return { providerReference, outcome: 'succeeded' };
    }
    if (event.type === 'payment_intent.payment_failed' || event.type === 'invoice.payment_failed') {
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
