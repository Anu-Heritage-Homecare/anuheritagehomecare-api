import { SubscriptionStatus } from '@prisma/client';
import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { PlansBillingReadModel, SubscriptionPageView } from '../ports/plans-billing-read.port';
import { ListPlanSubscriptionsUseCase } from './list-plan-subscriptions.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function catalog(): CarePlan[] {
  return [
    { type: CarePlanType.StandardMonthly, name: 'Standard Plan' } as unknown as CarePlan,
    { type: CarePlanType.Premium, name: 'Premium Plan' } as unknown as CarePlan,
  ];
}

function page(): SubscriptionPageView {
  return {
    total: 2,
    rows: [
      {
        id: 's1',
        recipientName: 'Margaret Johnson',
        accountHolderName: 'David Johnson',
        planType: 'STANDARD_MONTHLY',
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date('2026-01-10T00:00:00.000Z'),
        monthlyPriceMinor: 100_000,
      },
      {
        id: 's2',
        recipientName: 'Harold Smith',
        accountHolderName: 'Anna Smith',
        planType: 'PREMIUM',
        status: SubscriptionStatus.CANCELLED,
        startDate: new Date('2026-02-05T00:00:00.000Z'),
        monthlyPriceMinor: 150_000,
      },
    ],
  };
}

function useCase(): ListPlanSubscriptionsUseCase {
  const reads: PlansBillingReadModel = {
    overview: () => Promise.reject(new Error('unused')),
    listSubscriptions: () => Promise.resolve(page()),
  };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () => Promise.resolve(catalog()),
  };
  return new ListPlanSubscriptionsUseCase(reads, plans, clock);
}

describe('ListPlanSubscriptionsUseCase', () => {
  it('maps rows with plan names, client names and currency', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(2);
    expect(result.currency).toBe('USD');
    const active = result.rows[0];
    expect(active.clientName).toBe('Margaret Johnson');
    expect(active.accountHolderName).toBe('David Johnson');
    expect(active.planName).toBe('Standard Plan');
    expect(active.billingCycle).toBe('Monthly');
    expect(active.currency).toBe('USD');
    expect(active.remainingHours).toBeNull();
  });

  it('derives the next monthly renewal date and auto renew for an active subscription', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      page: 1,
      pageSize: 20,
    });
    const active = result.rows[0];
    expect(active.autoRenew).toBe(true);
    expect(active.nextRenewalDate).toBe('2026-10-10T00:00:00.000Z');
  });

  it('nulls renewal and auto renew for a cancelled subscription', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      page: 1,
      pageSize: 20,
    });
    const cancelled = result.rows[1];
    expect(cancelled.autoRenew).toBe(false);
    expect(cancelled.nextRenewalDate).toBeNull();
  });
});
