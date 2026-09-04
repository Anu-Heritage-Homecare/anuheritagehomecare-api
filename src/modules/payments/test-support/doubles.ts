import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  CardSetupInitialization,
  ChangeSubscriptionPlanParams,
  InitializePaymentParams,
  InitializeSubscriptionParams,
  PaymentGateway,
  PaymentInitialization,
  PaymentVerification,
  SavedCard,
  StartCardSetupParams,
  WebhookPaymentEvent,
} from '../application/ports/payment-gateway.port';
import { KycStatusService } from '@modules/kyc/application/ports/kyc-status.port';
import { PayableService, PayableSummary } from '../application/ports/payable-service.port';
import { PayableType } from '../domain/payable-type.enum';
import { Payment } from '../domain/payment.entity';
import { PaymentRepository } from '../domain/payment.repository';
import { PaymentMethod } from '../domain/payment-method.entity';
import { PaymentMethodRepository } from '../domain/payment-method.repository';

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
  /** Remembers who started each card setup so a saved card echoes their owner id. */
  public readonly cardOwners = new Map<string, string>();

  initialize(params: InitializePaymentParams): Promise<PaymentInitialization> {
    return Promise.resolve({
      providerReference: `prov_${params.reference}`,
      clientSecret: `cs_${params.reference}`,
    });
  }

  initializeSubscription(params: InitializeSubscriptionParams): Promise<PaymentInitialization> {
    return Promise.resolve({
      providerReference: `sub_${params.reference}`,
      clientSecret: `cs_${params.reference}`,
    });
  }

  startCardSetup(params: StartCardSetupParams): Promise<CardSetupInitialization> {
    const providerReference = `setup_${params.reference}`;
    this.cardOwners.set(providerReference, params.ownerId);
    return Promise.resolve({
      providerReference,
      providerCustomerRef: `cus_${params.ownerId}`,
      clientSecret: `seti_${params.reference}`,
    });
  }

  retrieveSavedCard(_provider: unknown, providerReference: string): Promise<SavedCard> {
    return Promise.resolve({
      ownerRef: this.cardOwners.get(providerReference) ?? 'unknown-owner',
      providerCustomerRef: 'cus_1',
      providerMethodRef: `pm_${providerReference}`,
      brand: 'Visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
    });
  }

  public readonly planChanges: ChangeSubscriptionPlanParams[] = [];

  changeSubscriptionPlan(params: ChangeSubscriptionPlanParams): Promise<void> {
    this.planChanges.push(params);
    return Promise.resolve();
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

/** In memory saved payment methods for use case tests. */
export class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  public readonly store = new Map<string, PaymentMethod>();

  save(method: PaymentMethod): Promise<void> {
    this.store.set(method.id, method);
    return Promise.resolve();
  }

  findById(id: string): Promise<PaymentMethod | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  listByOwner(ownerId: string): Promise<PaymentMethod[]> {
    const rows = [...this.store.values()]
      .filter((method) => method.ownerId === ownerId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    return Promise.resolve(rows);
  }

  delete(ownerId: string, id: string): Promise<void> {
    const method = this.store.get(id);
    if (method !== undefined && method.ownerId === ownerId) {
      this.store.delete(id);
    }
    return Promise.resolve();
  }

  setDefault(ownerId: string, id: string): Promise<void> {
    for (const method of this.store.values()) {
      if (method.ownerId === ownerId) {
        method.clearDefault();
      }
    }
    const target = this.store.get(id);
    if (target !== undefined && target.ownerId === ownerId) {
      target.makeDefault();
    }
    return Promise.resolve();
  }
}

/** KYC status stub; verified by default. */
export class FakeKycStatusService implements KycStatusService {
  constructor(private readonly verified = true) {}

  isVerified(): Promise<boolean> {
    return Promise.resolve(this.verified);
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
