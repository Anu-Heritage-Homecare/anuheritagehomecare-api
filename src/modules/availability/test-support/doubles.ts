import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { CaregiverAvailability } from '../domain/caregiver-availability.entity';
import { CaregiverAvailabilityRepository } from '../domain/caregiver-availability.repository';
import { startOfUtcDay } from '../application/availability-date.util';

export const FIXED_NOW = new Date('2026-07-11T12:00:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'availability'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export class InMemoryCaregiverAvailabilityRepository implements CaregiverAvailabilityRepository {
  public readonly store = new Map<string, CaregiverAvailability>();

  private key(caregiverId: string, date: Date): string {
    return `${caregiverId}:${startOfUtcDay(date).toISOString()}`;
  }

  findByCaregiverAndDate(caregiverId: string, date: Date): Promise<CaregiverAvailability | null> {
    return Promise.resolve(this.store.get(this.key(caregiverId, date)) ?? null);
  }

  listForCaregiverInRange(
    caregiverId: string,
    from: Date,
    to: Date,
  ): Promise<CaregiverAvailability[]> {
    const matches = [...this.store.values()]
      .filter(
        (record) =>
          record.caregiverId === caregiverId &&
          record.date.getTime() >= from.getTime() &&
          record.date.getTime() <= to.getTime(),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return Promise.resolve(matches);
  }

  save(availability: CaregiverAvailability): Promise<void> {
    this.store.set(this.key(availability.caregiverId, availability.date), availability);
    return Promise.resolve();
  }
}
