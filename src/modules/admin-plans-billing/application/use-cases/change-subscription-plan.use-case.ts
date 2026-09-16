import { Inject, Injectable } from '@nestjs/common';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

interface ChangeSubscriptionPlanCommand {
  subscriptionId: string;
  planType: string;
}

/**
 * Admin action: move a subscription to a different monthly plan tier, snapshotting
 * the new plan's price in the subscription's own currency from the catalog. Provider
 * side plan change (Stripe or Paystack) is handled separately by the payments
 * context and is out of scope for this record level change.
 */
@Injectable()
export class ChangeSubscriptionPlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ChangeSubscriptionPlanCommand): Promise<void> {
    const subscription = await this.subscriptions.findById(command.subscriptionId);
    if (subscription === null) {
      throw new NotFoundDomainException('Subscription not found');
    }

    const planType = Object.values(CarePlanType).find(
      (value) => String(value) === command.planType,
    );
    if (planType === undefined || planType === CarePlanType.Flexible) {
      throw new ValidationException('The target plan must be a monthly subscription plan');
    }

    const plan = await this.plans.findByType(planType);
    if (plan === null) {
      throw new NotFoundDomainException('Care plan not found');
    }
    const price = plan.priceFor(subscription.monthlyPrice.currency);
    if (price === null) {
      throw new ValidationException('The plan has no price in the subscription currency');
    }

    subscription.changePlan(planType, price.unitAmount, this.clock.now());
    await this.subscriptions.save(subscription);
  }
}
