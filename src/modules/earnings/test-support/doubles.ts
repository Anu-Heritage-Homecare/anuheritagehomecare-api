import { ConfigService } from '@nestjs/config';
import { Clock } from '@shared/application/ports/clock.port';
import { CaregiverPayRate } from '../domain/caregiver-pay-rate.entity';
import { CaregiverPayRateRepository } from '../domain/caregiver-pay-rate.repository';
import {
  CaregiverTimesheetDirectory,
  TimesheetEntry,
} from '../application/ports/caregiver-timesheet.port';

export const FIXED_NOW = new Date('2026-07-10T12:00:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_NOW };

/** A ConfigService that only answers the earnings config the use case reads. */
export function fakeEarningsConfig(
  overrides: Partial<{
    payPeriodDays: number;
    payPeriodAnchor: Date;
    paydayOffsetDays: number;
  }> = {},
): ConfigService {
  const config = {
    payPeriodDays: 14,
    payPeriodAnchor: new Date('2026-07-01T00:00:00.000Z'),
    paydayOffsetDays: 1,
    ...overrides,
  };
  return { getOrThrow: () => config } as unknown as ConfigService;
}

export class InMemoryCaregiverPayRateRepository implements CaregiverPayRateRepository {
  private readonly rates = new Map<string, CaregiverPayRate>();

  set(rate: CaregiverPayRate): void {
    this.rates.set(rate.caregiverId, rate);
  }

  findByCaregiver(caregiverId: string): Promise<CaregiverPayRate | null> {
    return Promise.resolve(this.rates.get(caregiverId) ?? null);
  }
}

export class FakeCaregiverTimesheetDirectory implements CaregiverTimesheetDirectory {
  private readonly entries: TimesheetEntry[] = [];

  add(entry: TimesheetEntry): void {
    this.entries.push(entry);
  }

  listForPeriod(): Promise<TimesheetEntry[]> {
    return Promise.resolve([...this.entries]);
  }
}
