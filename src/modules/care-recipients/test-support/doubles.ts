import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { CareRecipient } from '../domain/care-recipient.entity';
import { CareRecipientRepository } from '../domain/care-recipient.repository';
import { RecipientProfile } from '../domain/value-objects/recipient-profile.vo';

/**
 * Deterministic in memory test doubles for the care recipient use case specs.
 * They mirror the real ports closely enough to exercise the orchestration
 * without a database.
 */

export const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'care'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

/** A valid identity profile for building drafts in specs. */
export function buildProfile(
  overrides: Partial<Parameters<typeof RecipientProfile.create>[0]> = {},
): RecipientProfile {
  return RecipientProfile.create({
    name: 'Grace Okafor',
    gender: 'FEMALE',
    dateOfBirth: new Date('1950-04-20'),
    city: 'Lagos',
    state: 'Lagos State',
    fullAddress: 'No 4 Okeowoyomi street',
    relationship: 'Parent',
    livingSituation: 'Lives with family',
    photoKey: null,
    ...overrides,
  });
}

export class InMemoryCareRecipientRepository implements CareRecipientRepository {
  public readonly store = new Map<string, CareRecipient>();

  save(recipient: CareRecipient): Promise<void> {
    this.store.set(recipient.id, recipient);
    return Promise.resolve();
  }

  findById(id: string): Promise<CareRecipient | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByIds(ids: string[]): Promise<CareRecipient[]> {
    const found = ids
      .map((id) => this.store.get(id))
      .filter((recipient): recipient is CareRecipient => recipient !== undefined);
    return Promise.resolve(found);
  }

  listByOwner(ownerId: string): Promise<CareRecipient[]> {
    const owned = [...this.store.values()].filter((recipient) => recipient.ownerId === ownerId);
    return Promise.resolve(owned);
  }
}
