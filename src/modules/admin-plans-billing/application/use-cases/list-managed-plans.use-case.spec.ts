import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { ManagedCarePlan } from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import { ManagedCarePlanRepository } from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { BillingCycle } from '@modules/admin-care-plans/domain/billing-cycle.enum';
import { Currency } from '@shared/domain/currency.enum';
import { PlanPerformanceCardsResult } from '../dto/plan-performance-cards.result';
import { GetPlanPerformanceUseCase } from './get-plan-performance.use-case';
import { ListManagedPlansUseCase } from './list-managed-plans.use-case';

const NOW = new Date('2026-10-18T09:00:00.000Z');

function flexible(): ManagedCarePlan {
  return ManagedCarePlan.create({
    id: 'plan-1',
    coreType: CarePlanType.Flexible,
    overview: {
      name: 'Flexible Care',
      description: 'Pay per hour care.',
      targetAudience: 'Families with intermittent care needs',
      billingModel: BillingModel.Hourly,
      countriesEnabled: ['US', 'NG'],
      supportedCurrencies: [Currency.UnitedStatesDollar, Currency.NigerianNaira],
      minimumBillingHours: 10,
    },
    lifecycle: {
      autoRenewal: true,
      billingCycle: BillingCycle.Monthly,
      gracePeriodDays: 7,
      cancellationNoticeDays: 30,
    },
    prices: [
      {
        currency: Currency.UnitedStatesDollar,
        monthlyPriceMinor: 120_000,
        baseRateMinor: 4_500,
        emergencyDispatchRateMinor: 6_500,
        weekendPremiumMinor: 5_500,
      },
    ],
    now: NOW,
  });
}

function performance(): PlanPerformanceCardsResult {
  return {
    currency: 'USD',
    cards: [
      {
        planType: 'FLEXIBLE',
        planName: 'Flexible Care',
        billingModel: 'HOURLY',
        subscribers: 412,
        monthlyRevenueMinor: 49_440_000,
        unitPriceMinor: 4_500,
        retentionPercent: 94.2,
        renewalPercent: 91,
        badge: 'MOST_POPULAR',
      },
    ],
  };
}

function useCase(): ListManagedPlansUseCase {
  const repo: ManagedCarePlanRepository = {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    findByCoreType: () => Promise.resolve(null),
    listAll: () => Promise.resolve([flexible()]),
  };
  const perf = {
    execute: () => Promise.resolve(performance()),
  } as unknown as GetPlanPerformanceUseCase;
  return new ListManagedPlansUseCase(repo, perf);
}

describe('ListManagedPlansUseCase', () => {
  it('builds catalogue cards with configured price and live performance figures', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      includeArchived: false,
    });
    expect(result.plans).toHaveLength(1);
    const card = result.plans[0];
    expect(card.coreType).toBe('FLEXIBLE');
    expect(card.wiredToCheckout).toBe(true);
    expect(card.monthlyPriceMinor).toBe(120_000);
    expect(card.subscribers).toBe(412);
    expect(card.retentionPercent).toBe(94.2);
    expect(card.estRevenueMinor).toBe(49_440_000);
  });
});
