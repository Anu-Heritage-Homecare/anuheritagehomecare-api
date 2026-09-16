import { SubscriptionStatus } from '@prisma/client';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { OperationalAlertsReadModel } from '../ports/operational-alerts-read.port';
import { PlansBillingReadModel, SubscriptionPageView } from '../ports/plans-billing-read.port';
import { GetOperationalAlertsUseCase } from './get-operational-alerts.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function activePage(): SubscriptionPageView {
  return {
    total: 2,
    rows: [
      {
        id: 's1',
        recipientName: 'Client s1',
        accountHolderName: 'Holder s1',
        planType: 'STANDARD_MONTHLY',
        status: SubscriptionStatus.ACTIVE,
        // renews 2026-09-20, within two weeks -> expiring soon
        startDate: new Date('2026-06-20T00:00:00.000Z'),
        monthlyPriceMinor: 100_000,
      },
      {
        id: 's2',
        recipientName: 'Client s2',
        accountHolderName: 'Holder s2',
        planType: 'PREMIUM',
        status: SubscriptionStatus.ACTIVE,
        // renews 2026-10-10, not soon
        startDate: new Date('2026-06-10T00:00:00.000Z'),
        monthlyPriceMinor: 150_000,
      },
    ],
  };
}

function useCase(): GetOperationalAlertsUseCase {
  const alerts: OperationalAlertsReadModel = {
    alertCounts: () =>
      Promise.resolve({
        paymentFailedClients: 3,
        documentationMissing: 5,
        coordinatorNotAssigned: 4,
        subscriptionSuspended: 2,
      }),
  };
  const reads: PlansBillingReadModel = {
    overview: () => Promise.reject(new Error('unused')),
    listSubscriptions: () => Promise.resolve(activePage()),
  };
  return new GetOperationalAlertsUseCase(alerts, reads, clock);
}

describe('GetOperationalAlertsUseCase', () => {
  it('surfaces the state derived alert counts', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const byKey = new Map(result.alerts.map((a) => [a.key, a]));
    expect(byKey.get('PAYMENT_FAILED')?.count).toBe(3);
    expect(byKey.get('DOCUMENTATION_MISSING')?.count).toBe(5);
    expect(byKey.get('COORDINATOR_NOT_ASSIGNED')?.count).toBe(4);
    expect(byKey.get('SUBSCRIPTION_SUSPENDED')?.count).toBe(2);
  });

  it('derives plan expiring soon from the active renewal scan', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const expiring = result.alerts.find((a) => a.key === 'PLAN_EXPIRING_SOON');
    expect(expiring?.count).toBe(1);
  });

  it('reports flexible hours low as not tracked', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const low = result.alerts.find((a) => a.key === 'FLEXIBLE_HOURS_LOW');
    expect(low?.available).toBe(false);
    expect(low?.count).toBeNull();
  });
});
