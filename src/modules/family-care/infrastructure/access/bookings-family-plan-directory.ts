import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY, BookingRepository } from '@modules/bookings/domain/booking.repository';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { FamilyPlanDirectory } from '../../application/ports/family-plan-directory.port';

const PLAN_NAME: Record<CarePlanType, string> = {
  [CarePlanType.Flexible]: 'Flexible',
  [CarePlanType.StandardMonthly]: 'Standard Care',
  [CarePlanType.Premium]: 'Premium Care',
  [CarePlanType.LiveIn]: 'Live in Care',
};

/**
 * Resolves a recipient's plan name from the bookings context. A monthly
 * subscription is preferred (the ongoing plan); otherwise the most recent one
 * time booking's plan is used.
 */
@Injectable()
export class BookingsFamilyPlanDirectory implements FamilyPlanDirectory {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
  ) {}

  async planNameForRecipient(ownerId: string, careRecipientId: string): Promise<string | null> {
    const subscriptions = await this.subscriptions.listByOwner(ownerId);
    const subscription = subscriptions
      .filter((entry) => entry.careRecipientId === careRecipientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (subscription !== undefined) {
      return PLAN_NAME[subscription.planType];
    }

    const bookings = await this.bookings.listByOwner(ownerId);
    const booking = bookings
      .filter((entry) => entry.careRecipientId === careRecipientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return booking === undefined ? null : PLAN_NAME[booking.planType];
  }
}
