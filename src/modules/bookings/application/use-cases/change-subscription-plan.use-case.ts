import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../../domain/subscription.repository';

export interface ChangeSubscriptionPlanCommand {
  ownerId: string;
  subscriptionId: string;
  planType: string;
  monthlyPriceMinor: number;
  currency: string;
}

/**
 * Use case: change the plan tier recorded on a subscription and snapshot its new
 * monthly price. Owner scoped. Exposed for the billing context to call after the
 * provider side plan change has been made, so our record and the provider agree.
 */
@Injectable()
export class ChangeSubscriptionPlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ChangeSubscriptionPlanCommand): Promise<void> {
    const subscription = await this.subscriptions.findById(command.subscriptionId);
    if (subscription === null || subscription.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Subscription not found');
    }

    const planType = Object.values(CarePlanType).find(
      (value) => String(value) === command.planType,
    );
    if (planType === undefined) {
      throw new ValidationException('Unknown care plan');
    }
    const currency = Object.values(Currency).find((value) => String(value) === command.currency);
    if (currency === undefined) {
      throw new ValidationException('Unknown currency');
    }

    subscription.changePlan(
      planType,
      Money.fromMinor(command.monthlyPriceMinor, currency),
      this.clock.now(),
    );
    await this.subscriptions.save(subscription);
  }
}
