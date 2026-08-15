import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { BOOKING_REPOSITORY, BookingRepository } from '@modules/bookings/domain/booking.repository';
import { BookingStatus } from '@modules/bookings/domain/booking-status.enum';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { PayableType } from '../../domain/payable-type.enum';
import { PayableService, PayableSummary } from '../../application/ports/payable-service.port';

/**
 * Adapter that satisfies the payments PayableService port by delegating to the
 * bookings and subscriptions repositories. Reads the amount and currency to
 * charge, and, on success, confirms the booking or activates the subscription.
 */
@Injectable()
export class BookingsPayableService implements PayableService {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async load(payableType: PayableType, payableId: string): Promise<PayableSummary | null> {
    if (payableType === PayableType.Booking) {
      const booking = await this.bookings.findById(payableId);
      if (booking === null) {
        return null;
      }
      return {
        ownerId: booking.ownerId,
        currency: booking.price.total.currency,
        amountMinor: booking.price.total.amountMinor,
        alreadyPaid: booking.status !== BookingStatus.PendingPayment,
        recurring: null,
      };
    }

    const subscription = await this.subscriptions.findById(payableId);
    if (subscription === null) {
      return null;
    }
    const plan = await this.plans.findByType(subscription.planType);
    const price = plan?.priceFor(subscription.monthlyPrice.currency) ?? null;
    return {
      ownerId: subscription.ownerId,
      currency: subscription.monthlyPrice.currency,
      amountMinor: subscription.monthlyPrice.amountMinor,
      alreadyPaid: subscription.status !== SubscriptionStatus.PendingPayment,
      recurring: {
        stripePriceId: price?.stripePriceId ?? null,
        paystackPlanCode: price?.paystackPlanCode ?? null,
      },
    };
  }

  async markPaid(payableType: PayableType, payableId: string): Promise<void> {
    if (payableType === PayableType.Booking) {
      const booking = await this.bookings.findById(payableId);
      if (booking === null) {
        return;
      }
      booking.confirm(this.clock.now());
      await this.bookings.save(booking);
      return;
    }

    const subscription = await this.subscriptions.findById(payableId);
    if (subscription === null) {
      return;
    }
    subscription.activate(this.clock.now());
    await this.subscriptions.save(subscription);
  }
}
