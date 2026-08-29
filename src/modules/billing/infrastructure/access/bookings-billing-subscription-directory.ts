import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import { Subscription } from '@modules/bookings/domain/subscription.entity';
import {
  BillingSubscriptionDirectory,
  BillingSubscriptionView,
} from '../../application/ports/billing-directories.port';

/** Adapts the bookings context to the billing subscription port. */
@Injectable()
export class BookingsBillingSubscriptionDirectory implements BillingSubscriptionDirectory {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
  ) {}

  async listActiveForOwner(ownerId: string): Promise<BillingSubscriptionView[]> {
    const subscriptions = await this.subscriptions.listByOwner(ownerId);
    return subscriptions
      .filter((subscription) => subscription.status === SubscriptionStatus.Active)
      .map((subscription) => BookingsBillingSubscriptionDirectory.toView(subscription));
  }

  async findById(subscriptionId: string): Promise<BillingSubscriptionView | null> {
    const subscription = await this.subscriptions.findById(subscriptionId);
    return subscription === null ? null : BookingsBillingSubscriptionDirectory.toView(subscription);
  }

  private static toView(subscription: Subscription): BillingSubscriptionView {
    return {
      id: subscription.id,
      ownerId: subscription.ownerId,
      careRecipientId: subscription.careRecipientId,
      planType: String(subscription.planType),
      currency: String(subscription.monthlyPrice.currency),
      monthlyPriceMinor: subscription.monthlyPrice.amountMinor,
      startDate: subscription.startDate,
      active: subscription.status === SubscriptionStatus.Active,
    };
  }
}
