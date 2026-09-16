import { Inject, Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  PLANS_BILLING_READ_MODEL,
  PlansBillingReadModel,
  SubscriptionRowView,
} from '../ports/plans-billing-read.port';
import { RenewalEntryResult, RenewalGroupResult, RenewalsResult } from '../dto/renewals.result';
import { nextMonthlyRenewal } from '../renewal-schedule';

/**
 * How many active subscriptions to scan for upcoming renewals. Renewal dates are
 * derived (not stored), so they cannot be filtered in the query; the panel scans a
 * bounded set and reports when it is capped rather than silently truncating.
 */
const RENEWAL_SCAN_LIMIT = 500;

const DAY_MS = 86_400_000;

const WINDOWS: { window: string; label: string; from: number; to: number }[] = [
  { window: 'TODAY', label: 'Renewing Today', from: 0, to: 0 },
  { window: 'THIS_WEEK', label: 'This Week', from: 1, to: 7 },
  { window: 'NEXT_WEEK', label: 'Next Week', from: 8, to: 14 },
];

interface GetRenewalsTimelineCommand {
  currency: Currency;
}

/**
 * The Upcoming Renewals Timeline: active subscriptions whose next monthly renewal
 * falls today, this week or next week, grouped by window. Renewal dates are derived
 * from each subscription's start date. Read only, currency scoped.
 */
@Injectable()
export class GetRenewalsTimelineUseCase {
  constructor(
    @Inject(PLANS_BILLING_READ_MODEL) private readonly reads: PlansBillingReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetRenewalsTimelineCommand): Promise<RenewalsResult> {
    const now = this.clock.now();
    const todayStart = startOfUtcDay(now);
    const anchor = new Date(todayStart.getTime() - 1);
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [page, catalog] = await Promise.all([
      this.reads.listSubscriptions(
        prismaCurrency,
        PrismaSubscriptionStatus.ACTIVE,
        1,
        RENEWAL_SCAN_LIMIT,
      ),
      this.plans.findAllActive(),
    ]);
    const names = new Map(catalog.map((plan) => [String(plan.type), plan.name]));

    const buckets = new Map<string, RenewalEntryResult[]>(
      WINDOWS.map((w) => [w.window, [] as RenewalEntryResult[]]),
    );

    for (const row of page.rows) {
      const renewal = nextMonthlyRenewal(row.startDate, anchor);
      const offset = Math.round((startOfUtcDay(renewal).getTime() - todayStart.getTime()) / DAY_MS);
      const window = WINDOWS.find((w) => offset >= w.from && offset <= w.to);
      if (window === undefined) {
        continue;
      }
      buckets.get(window.window)?.push(this.toEntry(row, renewal, names, String(command.currency)));
    }

    return {
      currency: String(command.currency),
      generatedAt: now.toISOString(),
      scanned: page.rows.length,
      capped: page.total > RENEWAL_SCAN_LIMIT,
      groups: WINDOWS.map((w) => this.toGroup(w, buckets.get(w.window) ?? [])),
    };
  }

  private toEntry(
    row: SubscriptionRowView,
    renewal: Date,
    names: Map<string, string>,
    currency: string,
  ): RenewalEntryResult {
    return {
      subscriptionId: row.id,
      clientName: row.recipientName,
      planName: names.get(String(row.planType)) ?? String(row.planType),
      renewalDate: renewal.toISOString(),
      amountMinor: row.monthlyPriceMinor,
      currency,
      autoRenew: row.status === PrismaSubscriptionStatus.ACTIVE,
    };
  }

  private toGroup(
    window: { window: string; label: string },
    entries: RenewalEntryResult[],
  ): RenewalGroupResult {
    const sorted = [...entries].sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
    return {
      window: window.window,
      label: window.label,
      count: sorted.length,
      totalMinor: sorted.reduce((sum, entry) => sum + entry.amountMinor, 0),
      entries: sorted,
    };
  }
}

/** Midnight (UTC) of the day the instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
