import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { PlansBillingOverviewView } from '../ports/plans-billing-read.port';
import { GetPlansBillingOverviewUseCase } from './get-plans-billing-overview.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(overrides: Partial<PlansBillingOverviewView> = {}): PlansBillingOverviewView {
  const series = Array.from({ length: 12 }, (_, index) => ({
    monthStart: new Date(Date.UTC(2025, 9 + index, 1)),
    totalMinor: index === 11 ? 3_000_000 : 100_000,
  }));
  return {
    billedTodayMinor: 120_000,
    monthlyRevenueMinor: 3_000_000,
    lastMonthRevenueMinor: 2_500_000,
    activeSubscriptions: 20,
    pastDueSubscriptions: 3,
    newSubscriptionsThisMonth: 8,
    cancelledThisMonth: 2,
    pendingCareRequests: 23,
    distribution: [
      { planType: 'STANDARD_MONTHLY', activeSubscriptions: 10, monthlyRevenueMinor: 1_000_000 },
      { planType: 'PREMIUM', activeSubscriptions: 5, monthlyRevenueMinor: 750_000 },
      { planType: 'LIVE_IN', activeSubscriptions: 5, monthlyRevenueMinor: 1_250_000 },
    ],
    revenueSeries: series,
    flexibleBookingsThisMonth: 40,
    flexibleRevenueThisMonthMinor: 400_000,
    ...overrides,
  };
}

function plan(type: CarePlanType, name: string, billing: string, unitMinor: number): CarePlan {
  return {
    type,
    name,
    billingModel: billing,
    priceFor: () => ({ unitAmount: { amountMinor: unitMinor } }),
  } as unknown as CarePlan;
}

function catalog(): CarePlan[] {
  return [
    plan(CarePlanType.Flexible, 'Flexible Plan', 'HOURLY', 2_500),
    plan(CarePlanType.StandardMonthly, 'Standard Plan', 'MONTHLY', 100_000),
    plan(CarePlanType.Premium, 'Premium Plan', 'MONTHLY', 150_000),
    plan(CarePlanType.LiveIn, 'Live In Plan', 'MONTHLY', 250_000),
  ];
}

function useCase(
  overrides: Partial<PlansBillingOverviewView> = {},
): GetPlansBillingOverviewUseCase {
  const reads = { overview: () => Promise.resolve(view(overrides)) };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () => Promise.resolve(catalog()),
  };
  return new GetPlansBillingOverviewUseCase(reads, plans, clock);
}

describe('GetPlansBillingOverviewUseCase', () => {
  it('builds the KPI cards with month over month growth', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    expect(result.currency).toBe('USD');
    expect(result.kpis.billedTodayMinor).toBe(120_000);
    expect(result.kpis.monthlyRevenueMinor).toBe(3_000_000);
    expect(result.kpis.monthlyGrowthPercent).toBe(20);
    expect(result.kpis.activeSubscriptions).toBe(20);
    expect(result.kpis.pendingCareRequests).toBe(23);
    expect(result.kpis.pastDueSubscriptions).toBe(3);
  });

  it('returns a twelve point labelled revenue series', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    expect(result.revenueSeries).toHaveLength(12);
    expect(result.revenueSeries[0].label).toBe('Oct 2025');
    expect(result.revenueSeries[11].label).toBe('Sep 2026');
    expect(result.revenueSeries[11].totalMinor).toBe(3_000_000);
  });

  it('computes subscription distribution shares over active subscriptions', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const standard = result.distribution.find((d) => d.planType === 'STANDARD_MONTHLY');
    expect(standard?.planName).toBe('Standard Plan');
    expect(standard?.sharePercent).toBe(50);
    expect(result.distribution.find((d) => d.planType === 'PREMIUM')?.sharePercent).toBe(25);
  });

  it('builds plan performance with Flexible reading this month bookings', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    const flexible = result.planPerformance.find((p) => p.planType === 'FLEXIBLE');
    expect(flexible?.subscribers).toBe(40);
    expect(flexible?.monthlyRevenueMinor).toBe(400_000);
    expect(flexible?.unitPriceMinor).toBe(2_500);
    const premium = result.planPerformance.find((p) => p.planType === 'PREMIUM');
    expect(premium?.subscribers).toBe(5);
    expect(premium?.monthlyRevenueMinor).toBe(750_000);
  });

  it('derives operational insights honestly (CLV deferred to null)', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    expect(result.insights.recurringRevenueMinor).toBe(3_000_000);
    expect(result.insights.averageMonthlySpendMinor).toBe(150_000);
    expect(result.insights.premiumExpansionRatePercent).toBe(50);
    expect(result.insights.netNewSubscriptions).toBe(6);
    expect(result.insights.market).toBe('US');
    expect(result.insights.customerLifetimeValueMinor).toBeNull();
  });

  it('guards empty markets: null averages and growth, no divide by zero', async () => {
    const result = await useCase({
      activeSubscriptions: 0,
      distribution: [],
      lastMonthRevenueMinor: 0,
    }).execute({ currency: Currency.NigerianNaira });
    expect(result.currency).toBe('NGN');
    expect(result.insights.market).toBe('NG');
    expect(result.insights.averageMonthlySpendMinor).toBeNull();
    expect(result.insights.premiumExpansionRatePercent).toBeNull();
    expect(result.kpis.monthlyGrowthPercent).toBeNull();
  });
});
