import { Inject, Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  SUBSCRIPTIONS_ADMIN_READ_MODEL,
  SubscriptionsAdminReadModel,
  EnrichedSubscriptionRowView,
} from '../ports/subscriptions-admin-read.port';
import {
  EnrichedSubscriptionListResult,
  EnrichedSubscriptionRowResult,
  FlexibleHoursUsageResult,
} from '../dto/enriched-subscription-list.result';
import { nextMonthlyRenewal } from '../renewal-schedule';

interface ListEnrichedSubscriptionsCommand {
  currency: Currency;
  status: PrismaSubscriptionStatus | null;
  page: number;
  pageSize: number;
}

/**
 * The Active Subscriptions table: each subscription enriched with the patient age,
 * coordinator and caregiver, the real auto renew flag, the derived renewal date and
 * the flexible hours usage for Flexible plans. Read only, currency scoped.
 */
@Injectable()
export class ListEnrichedSubscriptionsUseCase {
  constructor(
    @Inject(SUBSCRIPTIONS_ADMIN_READ_MODEL)
    private readonly reads: SubscriptionsAdminReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: ListEnrichedSubscriptionsCommand,
  ): Promise<EnrichedSubscriptionListResult> {
    const now = this.clock.now();
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [page, catalog] = await Promise.all([
      this.reads.listEnriched(prismaCurrency, command.status, command.page, command.pageSize),
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
    row: EnrichedSubscriptionRowView,
    names: Map<string, string>,
    currency: string,
    now: Date,
  ): EnrichedSubscriptionRowResult {
    const cancelled = row.status === PrismaSubscriptionStatus.CANCELLED;
    const planType = String(row.planType);
    return {
      id: row.id,
      clientName: row.recipientName,
      patientAge: ageInYears(row.recipientDateOfBirth, now),
      accountHolderName: row.accountHolderName,
      planType,
      planName: names.get(planType) ?? planType,
      status: String(row.status),
      autoRenew: row.autoRenew,
      // Per subscription billing cycle is not modelled yet; monthly plans bill monthly.
      billingCycle: 'Monthly',
      renewalDate: cancelled ? null : nextMonthlyRenewal(row.startDate, now).toISOString(),
      monthlyPriceMinor: row.monthlyPriceMinor,
      currency,
      coordinatorName: row.coordinatorName,
      caregiverName: row.caregiverName,
      flexibleHours: this.flexibleHours(row, planType),
    };
  }

  private flexibleHours(
    row: EnrichedSubscriptionRowView,
    planType: string,
  ): FlexibleHoursUsageResult | null {
    if (planType !== String(CarePlanType.Flexible) || row.flexAllocatedTenths === null) {
      return null;
    }
    const allocated = row.flexAllocatedTenths;
    const used = row.flexConsumedTenths ?? 0;
    const remaining = Math.max(0, allocated - used);
    return {
      allocatedHours: allocated / 10,
      usedHours: used / 10,
      remainingHours: remaining / 10,
      percentUsed: allocated === 0 ? 0 : Math.round((used / allocated) * 1000) / 10,
    };
  }
}

/** Whole years between a date of birth and now, or null when there is no date. */
function ageInYears(dateOfBirth: Date | null, now: Date): number | null {
  if (dateOfBirth === null) {
    return null;
  }
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}
