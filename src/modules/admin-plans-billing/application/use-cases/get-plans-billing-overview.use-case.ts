import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  PLANS_BILLING_READ_MODEL,
  PlansBillingOverviewView,
  PlansBillingReadModel,
} from '../ports/plans-billing-read.port';
import {
  PlanPerformanceResult,
  PlansBillingOverviewResult,
  SubscriptionDistributionResult,
} from '../dto/plans-billing-overview.result';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EXPANSION_PLANS = new Set<string>([CarePlanType.Premium, CarePlanType.LiveIn]);

interface GetPlansBillingOverviewCommand {
  currency: Currency;
}

/**
 * Assemble the Plans and Billing control panel overview for one currency: the KPI
 * cards, the revenue analytics series, the subscription distribution, the plan
 * performance snapshot and the operational insights. Read only; every figure is a
 * single currency sum, never a mixed cross currency total.
 */
@Injectable()
export class GetPlansBillingOverviewUseCase {
  constructor(
    @Inject(PLANS_BILLING_READ_MODEL) private readonly reads: PlansBillingReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetPlansBillingOverviewCommand): Promise<PlansBillingOverviewResult> {
    const now = this.clock.now();
    const currency = command.currency;
    const prismaCurrency =
      currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [view, catalog] = await Promise.all([
      this.reads.overview(prismaCurrency, now),
      this.plans.findAllActive(),
    ]);

    const activeByPlan = new Map(view.distribution.map((row) => [String(row.planType), row]));
    const totalActive = view.activeSubscriptions;
    const recurringRevenueMinor = view.distribution.reduce(
      (sum, row) => sum + row.monthlyRevenueMinor,
      0,
    );
    const expansionActive = view.distribution
      .filter((row) => EXPANSION_PLANS.has(String(row.planType)))
      .reduce((sum, row) => sum + row.activeSubscriptions, 0);

    return {
      currency: String(currency),
      generatedAt: now.toISOString(),
      kpis: {
        billedTodayMinor: view.billedTodayMinor,
        monthlyRevenueMinor: view.monthlyRevenueMinor,
        monthlyGrowthPercent: percentChange(view.monthlyRevenueMinor, view.lastMonthRevenueMinor),
        activeSubscriptions: totalActive,
        pendingCareRequests: view.pendingCareRequests,
        newSubscriptionsThisMonth: view.newSubscriptionsThisMonth,
        pastDueSubscriptions: view.pastDueSubscriptions,
      },
      revenueSeries: view.revenueSeries.map((point) => ({
        label: `${MONTHS[point.monthStart.getUTCMonth()]} ${point.monthStart.getUTCFullYear()}`,
        monthStart: point.monthStart.toISOString(),
        totalMinor: point.totalMinor,
      })),
      distribution: this.buildDistribution(view, catalog, totalActive),
      planPerformance: this.buildPerformance(view, catalog, currency, activeByPlan),
      insights: {
        averageMonthlySpendMinor:
          totalActive === 0 ? null : Math.round(recurringRevenueMinor / totalActive),
        customerLifetimeValueMinor: null,
        recurringRevenueMinor,
        market: prismaCurrency === PrismaCurrency.NGN ? 'NG' : 'US',
        marketRevenueMinor: view.monthlyRevenueMinor,
        netNewSubscriptions: view.newSubscriptionsThisMonth - view.cancelledThisMonth,
        premiumExpansionRatePercent:
          totalActive === 0 ? null : round1((expansionActive / totalActive) * 100),
      },
    };
  }

  /** The subscription distribution donut, over monthly plans that carry subscriptions. */
  private buildDistribution(
    view: PlansBillingOverviewView,
    catalog: CarePlan[],
    totalActive: number,
  ): SubscriptionDistributionResult[] {
    const names = new Map(catalog.map((plan) => [String(plan.type), plan.name]));
    return view.distribution.map((row) => ({
      planType: String(row.planType),
      planName: names.get(String(row.planType)) ?? String(row.planType),
      activeSubscriptions: row.activeSubscriptions,
      sharePercent: totalActive === 0 ? 0 : round1((row.activeSubscriptions / totalActive) * 100),
      monthlyRevenueMinor: row.monthlyRevenueMinor,
    }));
  }

  /**
   * One card per catalog plan. Monthly plans read their subscriber count and
   * recurring revenue from the active subscription groups; the Flexible plan is pay
   * as you go, so it reports this month's confirmed bookings and their revenue.
   */
  private buildPerformance(
    view: PlansBillingOverviewView,
    catalog: CarePlan[],
    currency: Currency,
    activeByPlan: Map<string, PlansBillingOverviewView['distribution'][number]>,
  ): PlanPerformanceResult[] {
    return catalog.map((plan) => {
      const key = String(plan.type);
      const price = plan.priceFor(currency);
      const isFlexible = plan.type === CarePlanType.Flexible;
      const group = activeByPlan.get(key);
      return {
        planType: key,
        planName: plan.name,
        billingModel: String(plan.billingModel),
        subscribers: isFlexible
          ? view.flexibleBookingsThisMonth
          : (group?.activeSubscriptions ?? 0),
        monthlyRevenueMinor: isFlexible
          ? view.flexibleRevenueThisMonthMinor
          : (group?.monthlyRevenueMinor ?? 0),
        unitPriceMinor: price === null ? null : price.unitAmount.amountMinor,
      };
    });
  }
}

/** Month over month percent change, or null when the base is zero. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return round1(((current - previous) / previous) * 100);
}

/** Round to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
