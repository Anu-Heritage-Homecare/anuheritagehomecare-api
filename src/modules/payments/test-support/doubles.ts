import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  InitializePaymentParams,
  PaymentGateway,
  PaymentInitialization,
  PaymentVerification,
  WebhookPaymentEvent,
} from '../application/ports/payment-gateway.port';
import { PayableService, PayableSummary } from '../application/ports/payable-service.port';
import { PayableType } from '../domain/payable-type.enum';
import { Payment } from '../domain/payment.entity';
import { PaymentRepository } from '../domain/payment.repository';

export const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'pay'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export class InMemoryPaymentRepository implements PaymentRepository {
  public readonly store = new Map<string, Payment>();

  save(payment: Payment): Promise<void> {
    this.store.set(payment.id, payment);
    return Promise.resolve();
  }

  findById(id: string): Promise<Payment | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByProviderReference(providerReference: string): Promise<Payment | null> {
    const found = [...this.store.values()].find((p) => p.providerReference === providerReference);
    return Promise.resolve(found ?? null);
  }

  listByOwner(ownerId: string): Promise<Payment[]> {
    return Promise.resolve([...this.store.values()].filter((p) => p.ownerId === ownerId));
  }
}

/** Deterministic gateway: providerReference is derived from our reference. */
export class FakePaymentGateway implements PaymentGateway {
  initialize(params: InitializePaymentParams): Promise<PaymentInitialization> {
    return Promise.resolve({
      providerReference: `prov_${params.reference}`,
      clientSecret: `cs_${params.reference}`,
    });
  }

  verify(): Promise<PaymentVerification> {
    return Promise.resolve({ outcome: 'succeeded', amountMinor: 0, currency: 'USD' });
  }

  parseWebhook(_provider: unknown, rawBody: string, signature: string): WebhookPaymentEvent {
    if (signature !== 'valid') {
      throw new Error('Invalid signature');
    }
    return JSON.parse(rawBody) as WebhookPaymentEvent;
  }
}

/** In memory payables with a record of which were marked paid. */
export class FakePayableService implements PayableService {
  public readonly paid = new Set<string>();

  constructor(private readonly payables: Map<string, PayableSummary>) {}

  load(payableType: PayableType, payableId: string): Promise<PayableSummary | null> {
    return Promise.resolve(this.payables.get(`${payableType}:${payableId}`) ?? null);
  }

  markPaid(payableType: PayableType, payableId: string): Promise<void> {
    this.paid.add(`${payableType}:${payableId}`);
    return Promise.resolve();
  }
}
