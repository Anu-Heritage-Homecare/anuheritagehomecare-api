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

  saveMany(pings: LocationPing[]): Promise<void> {
    this.saved.push(...pings);
    return Promise.resolve();
  }
}
