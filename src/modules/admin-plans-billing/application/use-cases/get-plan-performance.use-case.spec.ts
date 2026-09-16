import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { PlanPerformanceReadModel, PlanPerformanceView } from '../ports/plan-performance-read.port';
import { GetPlanPerformanceUseCase } from './get-plan-performance.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(): PlanPerformanceView {
  return {
    monthly: [
      {
        planType: 'STANDARD_MONTHLY',
        activeCount: 498,
        monthlyRevenueMinor: 12_450_000,
        cancelledCount: 32,
        activeMatureCount: 470,
        maturedCount: 500,
      },
      {
        planType: 'PREMIUM',
        activeCount: 289,
        monthlyRevenueMinor: 9_570_000,
        cancelledCount: 11,
        activeMatureCount: 280,
        maturedCount: 290,
      },
    ],
    flexibleBookings: 412,
    flexibleRevenueMinor: 8_640_000,
  };
}

function plan(type: CarePlanType, name: string, billing: string, unit: number): CarePlan {
  return {
    type,
    name,
    billingModel: billing,
    priceFor: () => ({ unitAmount: { amountMinor: unit } }),
  } as unknown as CarePlan;
}

function catalog(): CarePlan[] {
  return [
    plan(CarePlanType.Flexible, 'Flexible Care', 'HOURLY', 2_500),
    plan(CarePlanType.StandardMonthly, 'Standard Monthly', 'MONTHLY', 124_500),
    plan(CarePlanType.Premium, 'Premium Daily', 'MONTHLY', 95_700),
  ];
}

function useCase(): GetPlanPerformanceUseCase {
  const reads: PlanPerformanceReadModel = { perPlan: () => Promise.resolve(view()) };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () => Promise.resolve(catalog()),
  };
  return new GetPlanPerformanceUseCase(reads, plans, clock);
}

describe('GetPlanPerformanceUseCase', () => {
  it('computes retention and an approximate renewal for monthly plans', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const standard = result.cards.find((c) => c.planType === 'STANDARD_MONTHLY');
    expect(standard?.subscribers).toBe(498);
    // 498 / (498 + 32) = 93.96 -> 94
    expect(standard?.retentionPercent).toBe(94);
    // 470 / 500 = 94
    expect(standard?.renewalPercent).toBe(94);
  });

  it('reads Flexible from bookings with null retention and renewal', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const flexible = result.cards.find((c) => c.planType === 'FLEXIBLE');
    expect(flexible?.subscribers).toBe(412);
    expect(flexible?.monthlyRevenueMinor).toBe(8_640_000);
    expect(flexible?.retentionPercent).toBeNull();
    expect(flexible?.renewalPercent).toBeNull();
  });

  it('tags the most popular and highest yield plans', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    // Standard has the most subscribers (498) -> Most Popular; Standard also highest
    // revenue, so High Yield falls to the next best revenue plan (Premium).
    const standard = result.cards.find((c) => c.planType === 'STANDARD_MONTHLY');
    const premium = result.cards.find((c) => c.planType === 'PREMIUM');
    expect(standard?.badge).toBe('MOST_POPULAR');
    expect(premium?.badge).toBe('HIGH_YIELD');
  });
});
