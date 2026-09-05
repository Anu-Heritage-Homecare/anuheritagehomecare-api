import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { UpcomingPaymentResult } from '../dto/billing.result';
import { nextMonthlyDate, toIsoDate } from '../billing-date.util';
import {
  BILLING_PAYMENT_DIRECTORY,
  BILLING_SUBSCRIPTION_DIRECTORY,
  BillingPaymentDirectory,
  BillingSubscriptionDirectory,
  BillingSubscriptionView,
} from '../ports/billing-directories.port';

export interface GetUpcomingPaymentQuery {
  ownerId: string;
  /** The owner's market country code, deciding the tax rate. */
  country: string;
}

const BASIS_POINTS = 10_000;

/**
 * Use case: the Upcoming Payment detail. It breaks the next charge into the base
 * plan price, the market tax and the total, and reports how it will be paid (the
 * default saved card and that auto pay is on, since the provider bills the
 * subscription automatically). The next payment date is derived from the plan
 * start. Owner scoped; a 404 when the owner has no active subscription.
 */
@Injectable()
export class GetUpcomingPaymentUseCase {
  private readonly billing: BillingConfig;

  constructor(
    @Inject(BILLING_SUBSCRIPTION_DIRECTORY)
    private readonly subscriptions: BillingSubscriptionDirectory,
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
    config: ConfigService,
  ) {
    this.billing = config.getOrThrow<BillingConfig>('billing');
  }

  async execute(query: GetUpcomingPaymentQuery): Promise<UpcomingPaymentResult> {
    const now = this.clock.now();
    const active = await this.subscriptions.listActiveForOwner(query.ownerId);
    const primary = GetUpcomingPaymentUseCase.primary(active);
    if (primary === null) {
      throw new NotFoundDomainException('No upcoming payment');
    }

    const basePlanMinor = primary.monthlyPriceMinor;
    const taxRateBps = this.billing.taxRateBpsByCountry[query.country.trim().toUpperCase()] ?? 0;
    const taxMinor = Math.floor((basePlanMinor * taxRateBps) / BASIS_POINTS);

    const paymentMethod = await this.payments.defaultCardForOwner(query.ownerId);

    return {
      nextPaymentDate: toIsoDate(nextMonthlyDate(primary.startDate, now)),
      currency: primary.currency,
      basePlanMinor,
      taxRateBps,
      taxMinor,
      totalMinor: basePlanMinor + taxMinor,
      autoPay: true,
      paymentMethod,
    };
  }

  /** The most recently started active subscription drives the upcoming charge. */
  private static primary(subscriptions: BillingSubscriptionView[]): BillingSubscriptionView | null {
    return (
      [...subscriptions].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0] ?? null
    );
  }
}
