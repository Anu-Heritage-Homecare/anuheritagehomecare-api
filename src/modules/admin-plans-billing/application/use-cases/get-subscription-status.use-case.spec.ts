import { SubscriptionStatus } from '@prisma/client';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  PlansBillingReadModel,
  SubscriptionPageView,
  SubscriptionRowView,
} from '../ports/plans-billing-read.port';
import { SubscriptionStatusReadModel } from '../ports/subscription-status-read.port';
import { GetSubscriptionStatusUseCase } from './get-subscription-status.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function activeRow(id: string, startDate: string): SubscriptionRowView {
  return {
    id,
    recipientName: `Client ${id}`,
    accountHolderName: `Holder ${id}`,
    planType: 'STANDARD_MONTHLY',
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(startDate),
    monthlyPriceMinor: 100_000,
  };
}

function activePage(): SubscriptionPageView {
  // s1 renews 2026-09-20 (within 14 days -> soon); s2 renews 2026-10-10 (not soon).
  return {
    total: 2,
    rows: [
      activeRow('s1', '2026-06-20T00:00:00.000Z'),
      activeRow('s2', '2026-06-10T00:00:00.000Z'),
    ],
  };
}

function useCase(): GetSubscriptionStatusUseCase {
  const counts: SubscriptionStatusReadModel = {
    statusCounts: () =>
      Promise.resolve({ active: 10, pendingPayment: 3, pastDue: 2, cancelled: 5 }),
  };
  const reads: PlansBillingReadModel = {
    overview: () => Promise.reject(new Error('unused')),
    listSubscriptions: () => Promise.resolve(activePage()),
  };
  return new GetSubscriptionStatusUseCase(counts, reads, clock);
}

describe('GetSubscriptionStatusUseCase', () => {
  it('splits active into renewing soon and the rest, and totals all accounts', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const byKey = new Map(result.buckets.map((b) => [b.key, b]));
    // 1 of the 2 scanned active rows renews within 14 days.
    expect(byKey.get('RENEWING_SOON')?.count).toBe(1);
    expect(byKey.get('ACTIVE')?.count).toBe(9);
    expect(byKey.get('PENDING_ACTIVATION')?.count).toBe(3);
    expect(byKey.get('PAUSED_OR_CANCELLED')?.count).toBe(7);
    // total = active(10) + pending(3) + pastDue(2) + cancelled(5)
    expect(result.totalAccounts).toBe(20);
  });

  it('computes shares against the total accounts', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const pending = result.buckets.find((b) => b.key === 'PENDING_ACTIVATION');
    expect(pending?.sharePercent).toBe(15);
  });
});
