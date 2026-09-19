import { Inject, Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { PLANS_BILLING_READ_MODEL, PlansBillingReadModel } from '../ports/plans-billing-read.port';
import {
  SUBSCRIPTION_STATUS_READ_MODEL,
  SubscriptionStatusReadModel,
} from '../ports/subscription-status-read.port';
import { StatusBucketResult, SubscriptionStatusResult } from '../dto/subscription-status.result';
import { nextMonthlyRenewal } from '../renewal-schedule';

/** Active subscriptions renewing within this many days count as Renewing Soon. */
const RENEWING_SOON_DAYS = 14;
/** Active subscriptions scanned to classify Renewing Soon. */
const SCAN_LIMIT = 500;
const DAY_MS = 86_400_000;

interface GetSubscriptionStatusCommand {
  currency: Currency;
}

/**
 * The Subscription Status donut for one market: active accounts split into those
 * renewing soon and the rest, pending activations, and paused or cancelled. Renewing
 * Soon is derived from each active subscription's monthly renewal date. Read only.
 */
@Injectable()
export class GetSubscriptionStatusUseCase {
  constructor(
    @Inject(SUBSCRIPTION_STATUS_READ_MODEL)
    private readonly counts: SubscriptionStatusReadModel,
    @Inject(PLANS_BILLING_READ_MODEL) private readonly reads: PlansBillingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetSubscriptionStatusCommand): Promise<SubscriptionStatusResult> {
    const now = this.clock.now();
    const soonCutoff = new Date(now.getTime() + RENEWING_SOON_DAYS * DAY_MS);
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [counts, activePage] = await Promise.all([
      this.counts.statusCounts(prismaCurrency),
      this.reads.listSubscriptions(prismaCurrency, PrismaSubscriptionStatus.ACTIVE, 1, SCAN_LIMIT),
    ]);

    const renewingSoon = activePage.rows.filter((row) => {
      const renewal = nextMonthlyRenewal(row.startDate, now);
      return renewal.getTime() <= soonCutoff.getTime();
    }).length;

    const activeNotSoon = Math.max(0, counts.active - renewingSoon);
    // Past due is folded into Cancelled here; the panel surfaces Paused separately.
    const cancelled = counts.pastDue + counts.cancelled;
    const total =
      counts.active + counts.pendingPayment + counts.paused + counts.pastDue + counts.cancelled;

    const buckets: StatusBucketResult[] = [
      bucket('ACTIVE', 'Active', activeNotSoon, total),
      bucket('RENEWING_SOON', 'Renewing Soon', renewingSoon, total),
      bucket('PENDING_ACTIVATION', 'Pending Activation', counts.pendingPayment, total),
      bucket('PAUSED', 'Paused', counts.paused, total),
      bucket('CANCELLED', 'Cancelled', cancelled, total),
    ];

    return {
      currency: String(command.currency),
      totalAccounts: total,
      capped: counts.active > SCAN_LIMIT,
      buckets,
    };
  }
}

function bucket(key: string, label: string, count: number, total: number): StatusBucketResult {
  return {
    key,
    label,
    count,
    sharePercent: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
  };
}
