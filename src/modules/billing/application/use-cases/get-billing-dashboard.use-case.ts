import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { BillingDashboardResult } from '../dto/billing.result';
import { isSameUtcMonth, nextMonthlyDate, toIsoDate } from '../billing-date.util';
import {
  BILLING_PAYMENT_DIRECTORY,
  BILLING_PLAN_DIRECTORY,
  BILLING_SUBSCRIPTION_DIRECTORY,
  BillingPaymentDirectory,
  BillingPlanDirectory,
  BillingSubscriptionDirectory,
  BillingSubscriptionView,
} from '../ports/billing-directories.port';

export interface GetBillingDashboardQuery {
  ownerId: string;
}

/**
 * Use case: the family owner's billing dashboard. It composes the active plan
 * (from the owner's subscription and the plan catalog), what has been paid this
 * calendar month (from settled payments) and the upcoming charge. Auto pay is on
 * whenever an active subscription exists, since the provider bills it
 * automatically; the next payment date is derived from the plan start.
 */
@Injectable()
export class GetBillingDashboardUseCase {
  constructor(
    @Inject(BILLING_SUBSCRIPTION_DIRECTORY)
    private readonly subscriptions: BillingSubscriptionDirectory,
    @Inject(BILLING_PLAN_DIRECTORY) private readonly plans: BillingPlanDirectory,
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetBillingDashboardQuery): Promise<BillingDashboardResult> {
    const now = this.clock.now();
    const active = await this.subscriptions.listActiveForOwner(query.ownerId);
    const primary = GetBillingDashboardUseCase.primary(active);

    const settled = (await this.payments.listForOwner(query.ownerId)).filter(
      (payment) => payment.succeeded,
    );
    const paidThisMonthMinor = settled
      .filter((payment) => isSameUtcMonth(payment.createdAt, now))
      .reduce((total, payment) => total + payment.amountMinor, 0);

    if (primary === null) {
      return {
        plan: null,
        summary: {
          currency: settled[0]?.currency ?? '',
          paidThisMonthMinor,
          upcomingPaymentMinor: 0,
          upcomingPaymentDate: null,
        },
      };
    }

    const planName = await this.plans.nameForType(primary.planType);
    const nextPaymentDate = toIsoDate(nextMonthlyDate(primary.startDate, now));

    return {
      plan: {
        planName: planName ?? primary.planType,
        planType: primary.planType,
        currency: primary.currency,
        monthlyPriceMinor: primary.monthlyPriceMinor,
        nextPaymentDate,
        autoPay: true,
      },
      summary: {
        currency: primary.currency,
        paidThisMonthMinor,
        upcomingPaymentMinor: primary.monthlyPriceMinor,
        upcomingPaymentDate: nextPaymentDate,
      },
    };
  }

  /** The most recently started active subscription drives the plan card. */
  private static primary(subscriptions: BillingSubscriptionView[]): BillingSubscriptionView | null {
    return (
      [...subscriptions].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0] ?? null
    );
  }
}
