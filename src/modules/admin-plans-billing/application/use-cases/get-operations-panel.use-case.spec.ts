import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { FlexibleHoursReadModel, FlexibleHoursView } from '../ports/flexible-hours-read.port';
import { GetOperationsPanelUseCase } from './get-operations-panel.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function hours(): FlexibleHoursView {
  return {
    bookingsThisMonth: 12,
    hoursBookedThisMonth: 84,
    revenueThisMonthMinor: 420_000,
    upcomingBookings: 5,
    upcomingHours: 30,
  };
}

function useCase(): GetOperationsPanelUseCase {
  const reads: FlexibleHoursReadModel = { flexibleHours: () => Promise.resolve(hours()) };
  return new GetOperationsPanelUseCase(reads, clock);
}

describe('GetOperationsPanelUseCase', () => {
  it('reports flexible hours with a null purchased balance', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    expect(result.flexibleHours.currency).toBe('USD');
    expect(result.flexibleHours.hoursBookedThisMonth).toBe(84);
    expect(result.flexibleHours.upcomingHours).toBe(30);
    expect(result.flexibleHours.remainingBalanceHours).toBeNull();
  });

  it('marks only approve care request as available, the rest deferred with a reason', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const byKey = new Map(result.commandActions.map((a) => [a.key, a]));
    expect(byKey.get('APPROVE_CARE_REQUEST')?.available).toBe(true);
    const deferred = result.commandActions.filter((a) => !a.available);
    expect(deferred.length).toBe(5);
    expect(deferred.every((a) => a.reason !== null)).toBe(true);
    expect(byKey.get('ISSUE_REFUND')?.available).toBe(false);
  });
});
