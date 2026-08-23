import { Currency } from '@shared/domain/currency.enum';
import { CaregiverPayRate } from '../../domain/caregiver-pay-rate.entity';
import {
  FakeCaregiverTimesheetDirectory,
  InMemoryCaregiverPayRateRepository,
  fakeEarningsConfig,
  fixedClock,
} from '../../test-support/doubles';
import { TimesheetEntryKind } from '../ports/caregiver-timesheet.port';
import { GetCurrentEarningsUseCase } from './get-current-earnings.use-case';

describe('GetCurrentEarningsUseCase', () => {
  let timesheet: FakeCaregiverTimesheetDirectory;
  let rates: InMemoryCaregiverPayRateRepository;
  let useCase: GetCurrentEarningsUseCase;

  beforeEach(() => {
    timesheet = new FakeCaregiverTimesheetDirectory();
    rates = new InMemoryCaregiverPayRateRepository();
    useCase = new GetCurrentEarningsUseCase(timesheet, rates, fakeEarningsConfig(), fixedClock);

    rates.set(
      CaregiverPayRate.create({
        id: 'rate-1',
        caregiverId: 'caregiver-1',
        currency: Currency.NigerianNaira,
        hourlyRateMinor: 1000,
        overtimeMultiplierBps: 15000,
        regularHoursCap: 80,
        weekendBonusMinor: 500,
        taxRateBps: 1000,
      }),
    );
  });

  it('summarises the current period, hours and priced breakdown', async () => {
    // 82 approved hours (80 regular + 2 overtime), two of them weekend visits.
    timesheet.add({
      kind: TimesheetEntryKind.Approved,
      scheduledDate: new Date('2026-07-01T00:00:00.000Z'), // Wednesday
      minutes: 80 * 60,
    });
    timesheet.add({
      kind: TimesheetEntryKind.Approved,
      scheduledDate: new Date('2026-07-04T00:00:00.000Z'), // Saturday
      minutes: 60,
    });
    timesheet.add({
      kind: TimesheetEntryKind.Approved,
      scheduledDate: new Date('2026-07-11T00:00:00.000Z'), // Saturday
      minutes: 60,
    });
    // 8 pending hours on a weekday.
    timesheet.add({
      kind: TimesheetEntryKind.Pending,
      scheduledDate: new Date('2026-07-06T00:00:00.000Z'), // Monday
      minutes: 8 * 60,
    });

    const result = await useCase.execute({ caregiverId: 'caregiver-1', country: 'NG' });

    expect(result.currency).toBe('NGN');
    expect(result.payPeriod).toEqual({
      start: '2026-07-01',
      end: '2026-07-14',
      payDay: '2026-07-15',
      totalDays: 14,
      elapsedDays: 10,
      daysUntilPayday: 5,
      progressPercent: 71,
    });
    expect(result.hours).toEqual({ approved: 82, pending: 8 });
    expect(result.breakdown).toEqual({
      regularHours: 80,
      regularPayMinor: 80000,
      overtimeHours: 2,
      overtimePayMinor: 3000,
      weekendVisits: 2,
      weekendBonusMinor: 1000,
      grossMinor: 84000,
      deductionsMinor: 8400,
      netMinor: 75600,
    });
    expect(result.estimatedPayMinor).toBe(75600);
    // Projected over 90 hours (10 overtime) if the pending hours are approved.
    expect(result.estimatedEarningsMinor).toBe(86400);
  });

  it('shows hours but zero pay when the caregiver has no rate on file', async () => {
    timesheet.add({
      kind: TimesheetEntryKind.Approved,
      scheduledDate: new Date('2026-07-01T00:00:00.000Z'),
      minutes: 40 * 60,
    });

    const result = await useCase.execute({ caregiverId: 'no-rate', country: 'NG' });

    expect(result.hours.approved).toBe(40);
    expect(result.estimatedPayMinor).toBe(0);
    expect(result.breakdown.grossMinor).toBe(0);
  });
});
