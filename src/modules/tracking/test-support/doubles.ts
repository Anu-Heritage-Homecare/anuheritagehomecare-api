import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { LocationPing } from '../domain/location-ping.entity';
import { LocationPingRepository } from '../domain/location-ping.repository';

export const FIXED_NOW = new Date('2026-07-12T09:15:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'ping'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export class InMemoryLocationPingRepository implements LocationPingRepository {
  public readonly saved: LocationPing[] = [];
  private readonly keys = new Set<string>();

  saveMany(pings: LocationPing[]): Promise<number> {
    let stored = 0;
    for (const ping of pings) {
      // Mirror the unique (caregiverId, clientId) idempotency of the database.
      const key = `${ping.caregiverId}:${ping.clientId}`;
      if (this.keys.has(key)) {
        continue;
      }
      this.keys.add(key);
      this.saved.push(ping);
      stored += 1;
    }
    return Promise.resolve(stored);
  }
}
