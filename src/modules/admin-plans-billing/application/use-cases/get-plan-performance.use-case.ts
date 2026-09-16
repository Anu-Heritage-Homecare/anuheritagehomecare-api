import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  PLAN_PERFORMANCE_READ_MODEL,
  PlanPerformanceReadModel,
  PlanPerformanceRowView,
} from '../ports/plan-performance-read.port';
import { PlanCardResult, PlanPerformanceCardsResult } from '../dto/plan-performance-cards.result';

/** Subscriptions older than this many days are treated as having reached a renewal. */
const MATURE_DAYS = 30;
const DAY_MS = 86_400_000;

interface GetPlanPerformanceCommand {
  currency: Currency;
}

/**
 * The Care Plan Distribution and Performance cards for one market: subscribers,
 * monthly revenue, retention and renewal per plan, with the Most Popular and High
 * Yield badges. Flexible reads from this month's confirmed bookings; retention and
 * renewal apply to monthly plans only. Read only.
 */
@Injectable()
export class GetPlanPerformanceUseCase {
  constructor(
    @Inject(PLAN_PERFORMANCE_READ_MODEL) private readonly reads: PlanPerformanceReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetPlanPerformanceCommand): Promise<PlanPerformanceCardsResult> {
    const now = this.clock.now();
    const matureBefore = new Date(now.getTime() - MATURE_DAYS * DAY_MS);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [view, catalog] = await Promise.all([
      this.reads.perPlan(prismaCurrency, matureBefore, monthStart),
      this.plans.findAllActive(),
    ]);
    const byPlan = new Map(view.monthly.map((row) => [String(row.planType), row]));

    const cards = catalog.map((plan): PlanCardResult => {
      const key = String(plan.type);
      const price = plan.priceFor(command.currency);
      const unitPriceMinor = price === null ? null : price.unitAmount.amountMinor;
      if (plan.type === CarePlanType.Flexible) {
        return {
          planType: key,
          planName: plan.name,
          billingModel: String(plan.billingModel),
          subscribers: view.flexibleBookings,
          monthlyRevenueMinor: view.flexibleRevenueMinor,
          unitPriceMinor,
          retentionPercent: null,
          renewalPercent: null,
          badge: null,
        };
      }
      const row = byPlan.get(key);
      return {
        planType: key,
        planName: plan.name,
        billingModel: String(plan.billingModel),
        subscribers: row?.activeCount ?? 0,
        monthlyRevenueMinor: row?.monthlyRevenueMinor ?? 0,
        unitPriceMinor,
        retentionPercent: retention(row),
        renewalPercent: renewal(row),
        badge: null,
      };
    });

    return { currency: String(command.currency), cards: badge(cards) };
  }
}

/** Share of ever activated subscriptions still active, or null when none activated. */
function retention(row: PlanPerformanceRowView | undefined): number | null {
  if (row === undefined) {
    return null;
  }
  const denom = row.activeCount + row.cancelledCount;
  return denom === 0 ? null : round1((row.activeCount / denom) * 100);
}

/** Active share among matured subscriptions, or null when none have matured. */
function renewal(row: PlanPerformanceRowView | undefined): number | null {
  if (row === undefined || row.maturedCount === 0) {
    return null;
  }
  return round1((row.activeMatureCount / row.maturedCount) * 100);
}

/**
 * Tag the plan with the most subscribers as Most Popular and the highest revenue
 * plan among the rest as High Yield, so the two badges never land on one card.
 */
function badge(cards: PlanCardResult[]): PlanCardResult[] {
  const popular = leader(cards, (card) => card.subscribers);
  const yield_ = leader(
    cards.filter((card) => card !== popular),
    (card) => card.monthlyRevenueMinor,
  );
  return cards.map((card) => {
    if (card === popular) {
      return { ...card, badge: 'MOST_POPULAR' };
    }
    if (card === yield_) {
      return { ...card, badge: 'HIGH_YIELD' };
    }
    return card;
  });
}

function leader(
  cards: PlanCardResult[],
  metric: (card: PlanCardResult) => number,
): PlanCardResult | null {
  let best: PlanCardResult | null = null;
  for (const card of cards) {
    if (metric(card) > 0 && (best === null || metric(card) > metric(best))) {
      best = card;
    }
  }
  return best;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
