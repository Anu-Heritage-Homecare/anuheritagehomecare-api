import { SubscriptionStatus } from '@prisma/client';
import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  PlansBillingReadModel,
  SubscriptionPageView,
  SubscriptionRowView,
} from '../ports/plans-billing-read.port';
import { GetRenewalsTimelineUseCase } from './get-renewals-timeline.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function row(id: string, startDate: string, planType: string, amount: number): SubscriptionRowView {
  return {
    id,
    recipientName: `Client ${id}`,
    accountHolderName: `Holder ${id}`,
    planType: planType as SubscriptionRowView['planType'],
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(startDate),
    monthlyPriceMinor: amount,
  };
}

function page(): SubscriptionPageView {
  return {
    total: 4,
    rows: [
      row('s1', '2026-06-16T00:00:00.000Z', 'STANDARD_MONTHLY', 100_000), // today
      row('s2', '2026-06-18T00:00:00.000Z', 'PREMIUM', 150_000), // this week
      row('s3', '2026-06-25T00:00:00.000Z', 'LIVE_IN', 250_000), // next week
      row('s4', '2026-06-10T00:00:00.000Z', 'STANDARD_MONTHLY', 100_000), // beyond window
    ],
  };
}

function catalog(): CarePlan[] {
  return [
    { type: CarePlanType.StandardMonthly, name: 'Standard Plan' } as unknown as CarePlan,
    { type: CarePlanType.Premium, name: 'Premium Plan' } as unknown as CarePlan,
    { type: CarePlanType.LiveIn, name: 'Live In Plan' } as unknown as CarePlan,
  ];
}

function useCase(): GetRenewalsTimelineUseCase {
  const reads: PlansBillingReadModel = {
    overview: () => Promise.reject(new Error('unused')),
    listSubscriptions: () => Promise.resolve(page()),
  };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () => Promise.resolve(catalog()),
  };
  return new GetRenewalsTimelineUseCase(reads, plans, clock);
}

describe('GetRenewalsTimelineUseCase', () => {
  it('buckets active subscriptions into today, this week and next week', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const byWindow = new Map(result.groups.map((g) => [g.window, g]));
    expect(byWindow.get('TODAY')?.count).toBe(1);
    expect(byWindow.get('THIS_WEEK')?.count).toBe(1);
    expect(byWindow.get('NEXT_WEEK')?.count).toBe(1);
  });

  it('places today renewal with the derived date and plan name', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const today = result.groups.find((g) => g.window === 'TODAY');
    expect(today?.entries[0].subscriptionId).toBe('s1');
    expect(today?.entries[0].renewalDate).toBe('2026-09-16T00:00:00.000Z');
    expect(today?.entries[0].planName).toBe('Standard Plan');
    expect(today?.totalMinor).toBe(100_000);
  });

  it('excludes renewals beyond next week and reports scan metadata', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const everyId = result.groups.flatMap((g) => g.entries.map((e) => e.subscriptionId));
    expect(everyId).not.toContain('s4');
    expect(result.scanned).toBe(4);
    expect(result.capped).toBe(false);
  });
});
