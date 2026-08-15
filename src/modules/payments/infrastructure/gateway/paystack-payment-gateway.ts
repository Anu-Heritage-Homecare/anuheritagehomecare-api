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
import {
  ProviderGateway,
  ProviderInitializeParams,
  ProviderInitializeSubscriptionParams,
} from './provider-gateway';

const PAYSTACK_API = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  data: { reference: string; authorization_url: string };
}

interface PaystackVerifyResponse {
  data: { status: string; amount: number; currency: string };
}

/**
 * Paystack adapter (NGN). Initializes and verifies transactions over the Paystack
 * REST API and verifies webhook signatures (HMAC SHA512 of the raw body with the
 * secret key). Fails closed if the secret key is not configured. NOTE: written
 * against the Paystack API but not yet verified end to end against a live account.
 */
@Injectable()
export class PaystackPaymentGateway implements ProviderGateway {
  private readonly config: PaymentConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<PaymentConfig>('payment');
  }

  private secret(): string {
    if (this.config.paystackSecretKey.length === 0) {
      throw new Error('Paystack is not configured (PAYSTACK_SECRET_KEY is empty)');
    }
    return this.config.paystackSecretKey;
  }

  async initialize(params: ProviderInitializeParams): Promise<PaymentInitialization> {
    const payload: Record<string, unknown> = {
      email: params.ownerEmail,
      amount: params.amount.amountMinor,
      currency: params.amount.currency,
      reference: params.reference,
      metadata: params.metadata,
    };
    if (this.config.callbackUrl.length > 0) {
      payload.callback_url = this.config.callbackUrl;
    }

    const response = await this.call<PaystackInitializeResponse>(
      'POST',
      '/transaction/initialize',
      payload,
    );
    return {
      providerReference: response.data.reference,
      authorizationUrl: response.data.authorization_url,
    };
  }

  async initializeSubscription(
    params: ProviderInitializeSubscriptionParams,
  ): Promise<PaymentInitialization> {
    // Initializing a transaction with a plan makes Paystack create the
    // subscription automatically once the first payment succeeds.
    const payload: Record<string, unknown> = {
      email: params.ownerEmail,
      plan: params.planReference,
      reference: params.reference,
      metadata: params.metadata,
    };
    if (this.config.callbackUrl.length > 0) {
      payload.callback_url = this.config.callbackUrl;
    }

    const response = await this.call<PaystackInitializeResponse>(
      'POST',
      '/transaction/initialize',
      payload,
    );
    return {
      providerReference: response.data.reference,
      authorizationUrl: response.data.authorization_url,
    };
  }

  async verify(providerReference: string): Promise<PaymentVerification> {
    const response = await this.call<PaystackVerifyResponse>(
      'GET',
      `/transaction/verify/${encodeURIComponent(providerReference)}`,
    );
    return {
      outcome: PaystackPaymentGateway.toOutcome(response.data.status),
      amountMinor: response.data.amount,
      currency: response.data.currency,
    };
  }

  parseWebhook(rawBody: string, signature: string): WebhookPaymentEvent {
    const key =
      this.config.paystackWebhookSecret.length > 0
        ? this.config.paystackWebhookSecret
        : this.secret();
    const expected = createHmac('sha512', key).update(rawBody).digest('hex');
    if (!PaystackPaymentGateway.safeEqual(expected, signature)) {
      throw new Error('Invalid Paystack webhook signature');
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      data: { reference: string };
    };
    const providerReference = event.data.reference;
    if (event.event === 'charge.success') {
      return { providerReference, outcome: 'succeeded' };
    }
    if (event.event === 'charge.failed') {
      return { providerReference, outcome: 'failed' };
    }
    return { providerReference, outcome: 'pending' };
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    payload?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${PAYSTACK_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secret()}`,
        'Content-Type': 'application/json',
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Paystack request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private static toOutcome(status: string): GatewayOutcome {
    if (status === 'success') {
      return 'succeeded';
    }
    if (status === 'failed' || status === 'abandoned' || status === 'reversed') {
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
