import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionStatus as PrismaSubscriptionStatus } from '@prisma/client';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  SUBSCRIPTIONS_ADMIN_READ_MODEL,
  SubscriptionDetailView,
  SubscriptionsAdminReadModel,
} from '../ports/subscriptions-admin-read.port';
import {
  FlexibleHoursAllocationResult,
  SubscriptionDetailResult,
} from '../dto/subscription-detail.result';
import { nextMonthlyRenewal } from '../renewal-schedule';

/**
 * The full subscription detail behind every tab (Overview, Billing, Flexible Hours,
 * Renewals, Coordinator, Caregiver, Payment History, Activity Timeline, Notes, Audit
 * Log), composed from the subscription, the operational overlay, the recipient, the
 * owner and the payments. Read only.
 */
@Injectable()
export class GetSubscriptionDetailUseCase {
  constructor(
    @Inject(SUBSCRIPTIONS_ADMIN_READ_MODEL)
    private readonly reads: SubscriptionsAdminReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<SubscriptionDetailResult> {
    const detail = await this.reads.subscriptionDetail(id);
    if (detail === null) {
      throw new NotFoundDomainException('Subscription not found');
    }
    const now = this.clock.now();
    const planType = String(detail.planType);
    const catalog = await this.plans.findAllActive();
    const planName = catalog.find((plan) => String(plan.type) === planType)?.name ?? planType;
    const cancelled = detail.status === PrismaSubscriptionStatus.CANCELLED;

    return {
      id: detail.id,
      planType,
      planName,
      status: String(detail.status),
      autoRenew: detail.autoRenew,
      monthlyPriceMinor: detail.monthlyPriceMinor,
      currency: detail.currencyCode,
      billingCycle: 'Monthly',
      contractStartDate: (detail.contractStartAt ?? detail.startDate).toISOString(),
      activationDate: detail.activatedAt === null ? null : detail.activatedAt.toISOString(),
      nextRenewalDate: cancelled ? null : nextMonthlyRenewal(detail.startDate, now).toISOString(),
      patient: {
        name: detail.recipientName,
        age: ageInYears(detail.recipientDateOfBirth, now),
        gender: detail.recipientGender,
        conditions: detail.recipientConditions,
      },
      primaryContact: {
        name: detail.ownerName,
        phone: detail.ownerPhone,
        email: detail.ownerEmail,
        address: detail.ownerAddress,
      },
      coordinatorName: detail.coordinatorName,
      caregiverName: detail.caregiverName,
      flexibleHours: this.flexibleHours(detail),
      timeline: detail.events.map((event) => ({
        type: String(event.type),
        detail: event.detail,
        hoursDelta: event.hoursDeltaTenths === null ? null : event.hoursDeltaTenths / 10,
        actorAdminId: event.actorAdminId,
        actorLabel: event.actorLabel,
        occurredAt: event.occurredAt.toISOString(),
      })),
      notes: detail.notes.map((note) => ({
        body: note.body,
        authorAdminId: note.authorAdminId,
        authorName: note.authorName,
        createdAt: note.createdAt.toISOString(),
      })),
      payments: detail.payments.map((payment) => ({
        reference: payment.reference,
        provider: String(payment.provider),
        amountMinor: payment.amountMinor,
        status: String(payment.status),
        createdAt: payment.createdAt.toISOString(),
      })),
      hasOverlay: detail.hasOverlay,
    };
  }

  private flexibleHours(detail: SubscriptionDetailView): FlexibleHoursAllocationResult | null {
    if (detail.flexAllocatedTenths === null) {
      return null;
    }
    const allocated = detail.flexAllocatedTenths;
    const used = detail.flexConsumedTenths ?? 0;
    return {
      allocatedHours: allocated / 10,
      usedHours: used / 10,
      remainingHours: Math.max(0, allocated - used) / 10,
      percentUsed: allocated === 0 ? 0 : Math.round((used / allocated) * 1000) / 10,
      cycleEndsAt: detail.flexCycleEndsAt === null ? null : detail.flexCycleEndsAt.toISOString(),
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
