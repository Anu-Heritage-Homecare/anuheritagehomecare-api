import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  KycVerificationOutcome,
  KycVerificationRequest,
  KycVerifier,
} from '../application/ports/kyc-verifier.port';
import { KycWebhookEvent, KycWebhookGateway } from '../application/ports/kyc-webhook.port';
import { FaceMatchOutcome } from '../domain/face-match-outcome.enum';
import { ProviderIdentity } from '../domain/identity-matcher';
import { KycDocumentType } from '../domain/kyc-document-type.enum';
import { KycProvider } from '../domain/kyc-provider.enum';
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

/** Verifier that returns a preset outcome, recording the last request it saw. */
export class FakeKycVerifier implements KycVerifier {
  public lastRequest: KycVerificationRequest | null = null;

  constructor(private readonly outcome: KycVerificationOutcome) {}

  verify(request: KycVerificationRequest): Promise<KycVerificationOutcome> {
    this.lastRequest = request;
    return Promise.resolve(this.outcome);
  }
}

/** Build a completed QoreID style outcome for specs. */
export function completedOutcome(
  identity: ProviderIdentity,
  faceMatch: FaceMatchOutcome,
): KycVerificationOutcome {
  return {
    state: 'completed',
    providerReference: 'qore-ref',
    identity,
    faceMatch,
    documentType: KycDocumentType.Nin,
    maskedReference: '8901',
  };
}

/** Build a pending Stripe style outcome for specs. */
export function pendingOutcome(): KycVerificationOutcome {
  return { state: 'pending', providerReference: 'vs_123', clientSecret: 'vs_123_secret' };
}

interface WebhookBody {
  providerReference: string;
  state: KycWebhookEvent['state'];
  identity?: { firstName?: string; lastName?: string; dateOfBirth?: string };
  faceMatch?: FaceMatchOutcome;
  documentType?: KycDocumentType;
  maskedReference?: string;
}

/** Webhook gateway that parses a JSON body and rejects a bad signature. */
export class FakeKycWebhookGateway implements KycWebhookGateway {
  parse(_provider: KycProvider, rawBody: string, signature: string): KycWebhookEvent {
    if (signature !== 'valid') {
      throw new Error('Invalid signature');
    }
    const body = JSON.parse(rawBody) as WebhookBody;
    const identity: ProviderIdentity | undefined =
      body.identity === undefined
        ? undefined
        : {
            firstName: body.identity.firstName ?? null,
            lastName: body.identity.lastName ?? null,
            dateOfBirth:
              body.identity.dateOfBirth === undefined ? null : new Date(body.identity.dateOfBirth),
          };
    return {
      providerReference: body.providerReference,
      state: body.state,
      identity,
      faceMatch: body.faceMatch,
      documentType: body.documentType,
      maskedReference: body.maskedReference,
    };
  }
}
