import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  KycOutcome,
  KycVerificationOutcome,
  KycVerifier,
} from '../application/ports/kyc-verifier.port';
import {
  KycWebhookEvent,
  KycWebhookGateway,
  KycWebhookOutcome,
} from '../application/ports/kyc-webhook.port';
import { KycVerification } from '../domain/kyc-verification.entity';
import { KycVerificationRepository } from '../domain/kyc-verification.repository';

export const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'kyc'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export class InMemoryKycRepository implements KycVerificationRepository {
  public readonly store = new Map<string, KycVerification>();

  save(verification: KycVerification): Promise<void> {
    this.store.set(verification.ownerId, verification);
    return Promise.resolve();
  }

  findByOwner(ownerId: string): Promise<KycVerification | null> {
    return Promise.resolve(this.store.get(ownerId) ?? null);
  }

  findByProviderReference(providerReference: string): Promise<KycVerification | null> {
    const found = [...this.store.values()].find(
      (verification) => verification.providerReference === providerReference,
    );
    return Promise.resolve(found ?? null);
  }
}

/** Webhook gateway that parses a JSON body and rejects a bad signature. */
export class FakeKycWebhookGateway implements KycWebhookGateway {
  parse(_provider: unknown, rawBody: string, signature: string): KycWebhookEvent {
    if (signature !== 'valid') {
      throw new Error('Invalid signature');
    }
    return JSON.parse(rawBody) as { providerReference: string; outcome: KycWebhookOutcome };
  }
}

/** Verifier that returns a fixed outcome, recording the last request it saw. */
export class FakeKycVerifier implements KycVerifier {
  public lastDocumentValue: string | null = null;

  constructor(private readonly outcome: KycOutcome = 'verified') {}

  verify(request: { documentValue: string }): Promise<KycVerificationOutcome> {
    this.lastDocumentValue = request.documentValue;
    return Promise.resolve({ outcome: this.outcome, providerReference: 'prov-ref' });
  }
}
