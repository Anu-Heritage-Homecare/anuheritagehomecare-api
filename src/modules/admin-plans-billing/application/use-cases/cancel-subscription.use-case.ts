import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

interface CancelSubscriptionCommand {
  subscriptionId: string;
}

/**
 * Admin action: cancel a subscription on our record. Stopping the recurring charge
 * at the provider is handled separately by the payments context.
 */
@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<void> {
    const subscription = await this.subscriptions.findById(command.subscriptionId);
    if (subscription === null) {
      throw new NotFoundDomainException('Subscription not found');
    }
    subscription.cancel(this.clock.now());
    await this.subscriptions.save(subscription);
  }
}
