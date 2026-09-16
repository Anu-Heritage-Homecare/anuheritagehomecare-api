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
import { SubscriptionListResult, SubscriptionRowResult } from '../dto/subscription-list.result';
import { nextMonthlyRenewal } from '../renewal-schedule';

interface ListPlanSubscriptionsCommand {
  currency: Currency;
  status: PrismaSubscriptionStatus | null;
  page: number;
  pageSize: number;
}

/**
 * List subscriptions for one market (currency), newest first, with the plan name,
 * the derived next renewal date and a derived auto renew flag. Read only.
 */
@Injectable()
export class ListPlanSubscriptionsUseCase {
  constructor(
    @Inject(PLANS_BILLING_READ_MODEL) private readonly reads: PlansBillingReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ListPlanSubscriptionsCommand): Promise<SubscriptionListResult> {
    const now = this.clock.now();
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [page, catalog] = await Promise.all([
      this.reads.listSubscriptions(prismaCurrency, command.status, command.page, command.pageSize),
      this.plans.findAllActive(),
    ]);
    const names = new Map(catalog.map((plan) => [String(plan.type), plan.name]));

    return {
      currency: String(command.currency),
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => this.toRow(row, names, String(command.currency), now)),
    };
  }

  private toRow(
    row: SubscriptionRowView,
    names: Map<string, string>,
    currency: string,
    now: Date,
  ): SubscriptionRowResult {
    const cancelled = row.status === PrismaSubscriptionStatus.CANCELLED;
    return {
      id: row.id,
      clientName: row.recipientName,
      accountHolderName: row.accountHolderName,
      planType: String(row.planType),
      planName: names.get(String(row.planType)) ?? String(row.planType),
      billingCycle: 'Monthly',
      status: String(row.status),
      startDate: row.startDate.toISOString(),
      nextRenewalDate: cancelled ? null : nextMonthlyRenewal(row.startDate, now).toISOString(),
      monthlyPriceMinor: row.monthlyPriceMinor,
      currency,
      autoRenew: row.status === PrismaSubscriptionStatus.ACTIVE,
      remainingHours: null,
    };
  }
}
