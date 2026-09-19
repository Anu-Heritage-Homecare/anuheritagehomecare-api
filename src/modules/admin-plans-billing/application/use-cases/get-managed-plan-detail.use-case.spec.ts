import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { ManagedCarePlan } from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import { ManagedCarePlanRepository } from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { BillingCycle } from '@modules/admin-care-plans/domain/billing-cycle.enum';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { PlanPerformanceCardsResult } from '../dto/plan-performance-cards.result';
import { GetManagedPlanDetailUseCase } from './get-managed-plan-detail.use-case';
import { GetPlanPerformanceUseCase } from './get-plan-performance.use-case';

const NOW = new Date('2026-10-18T09:00:00.000Z');

function plan(): ManagedCarePlan {
  const created = ManagedCarePlan.create({
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
    services: [
      { key: 'MEDICATION_SUPPORT', name: 'Medication Support', description: 'x', enabled: true },
    ],
    now: NOW,
  });
  created.setCoverageAreas(['Springfield'], 'admin-1', NOW);
  return created;
}

function useCase(found: ManagedCarePlan | null): GetManagedPlanDetailUseCase {
  const repo: ManagedCarePlanRepository = {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(found),
    findByCoreType: () => Promise.resolve(null),
    listAll: () => Promise.resolve([]),
  };
  const performance: PlanPerformanceCardsResult = {
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
  const perf = {
    execute: () => Promise.resolve(performance),
  } as unknown as GetPlanPerformanceUseCase;
  return new GetManagedPlanDetailUseCase(repo, perf);
}

describe('GetManagedPlanDetailUseCase', () => {
  it('returns the full config and the analytics for a core plan', async () => {
    const result = await useCase(plan()).execute({
      id: 'plan-1',
      currency: Currency.UnitedStatesDollar,
    });
    expect(result.name).toBe('Flexible Care');
    expect(result.wiredToCheckout).toBe(true);
    expect(result.lifecycle.billingCycle).toBe('MONTHLY');
    expect(result.pricing[0].baseRateMinor).toBe(4_500);
    expect(result.services[0].key).toBe('MEDICATION_SUPPORT');
    expect(result.coverageAreas).toEqual(['Springfield']);
    expect(result.analytics?.subscribers).toBe(412);
    expect(result.versionHistory.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects an unknown plan', async () => {
    await expect(
      useCase(null).execute({ id: 'nope', currency: Currency.UnitedStatesDollar }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
