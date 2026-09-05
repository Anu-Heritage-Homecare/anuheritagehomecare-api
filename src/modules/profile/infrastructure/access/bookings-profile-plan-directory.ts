import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { ProfilePlanDirectory } from '../../application/ports/profile-directories.port';

/**
 * Resolves the owner's active plan name from their most recently started active
 * subscription and the plan catalog, for the profile plan badge.
 */
@Injectable()
export class BookingsProfilePlanDirectory implements ProfilePlanDirectory {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
  ) {}

  async activePlanNameForOwner(ownerId: string): Promise<string | null> {
    const active = (await this.subscriptions.listByOwner(ownerId))
      .filter((subscription) => subscription.status === SubscriptionStatus.Active)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    const current = active[0] ?? null;
    if (current === null) {
      return null;
    }
    const plan = await this.plans.findByType(current.planType);
    return plan === null ? null : plan.name;
  }
}
