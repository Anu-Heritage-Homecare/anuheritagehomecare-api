import { BookingRepository } from '@modules/bookings/domain/booking.repository';
import { BookingStatus } from '@modules/bookings/domain/booking-status.enum';
import { Booking } from '@modules/bookings/domain/booking.entity';
import { SubscriptionRepository } from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import { Subscription } from '@modules/bookings/domain/subscription.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { VisitScheduler } from '@modules/visits/application/ports/visit-scheduler.port';
import { Clock } from '@shared/application/ports/clock.port';
import { PayableType } from '../../domain/payable-type.enum';
import { BookingsPayableService } from './bookings-payable-service';

const NOW = new Date('2026-02-01T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

interface RecordingScheduler extends VisitScheduler {
  bookingCalls: number;
  subscriptionCalls: number;
}

function recordingScheduler(): RecordingScheduler {
  const scheduler: RecordingScheduler = {
    bookingCalls: 0,
    subscriptionCalls: 0,
    scheduleForBooking: () => {
      scheduler.bookingCalls += 1;
      return Promise.resolve();
    },
    scheduleForSubscription: () => {
      scheduler.subscriptionCalls += 1;
      return Promise.resolve();
    },
  };
  return scheduler;
}

function fakeBooking(status: BookingStatus): Booking {
  let current = status;
  return {
    get status() {
      return current;
    },
    confirm() {
      current = BookingStatus.Confirmed;
    },
    careRecipientId: 'care-1',
    serviceDate: NOW,
    startTime: { minutes: 540 },
    endMinute: 900,
  } as unknown as Booking;
}

function fakeSubscription(status: SubscriptionStatus): Subscription {
  let current = status;
  return {
    get status() {
      return current;
    },
    activate() {
      current = SubscriptionStatus.Active;
    },
    careRecipientId: 'care-1',
    startDate: NOW,
  } as unknown as Subscription;
}

function bookingRepo(booking: Booking | null): BookingRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(booking),
    listByOwner: () => Promise.resolve([]),
  };
}

function subscriptionRepo(subscription: Subscription | null): SubscriptionRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(subscription),
    listByOwner: () => Promise.resolve([]),
  };
}

const plans = {} as unknown as CarePlanRepository;

function serviceWith(
  scheduler: RecordingScheduler,
  booking: Booking | null,
  subscription: Subscription | null,
): BookingsPayableService {
  return new BookingsPayableService(
    bookingRepo(booking),
    subscriptionRepo(subscription),
    plans,
    scheduler,
    clock,
  );
}

describe('BookingsPayableService visit generation', () => {
  it('generates a visit the first time a booking is confirmed', async () => {
    const scheduler = recordingScheduler();
    await serviceWith(scheduler, fakeBooking(BookingStatus.PendingPayment), null).markPaid(
      PayableType.Booking,
      'booking-1',
    );
    expect(scheduler.bookingCalls).toBe(1);
  });

  it('does not regenerate when a webhook replays on an already confirmed booking', async () => {
    const scheduler = recordingScheduler();
    await serviceWith(scheduler, fakeBooking(BookingStatus.Confirmed), null).markPaid(
      PayableType.Booking,
      'booking-1',
    );
    expect(scheduler.bookingCalls).toBe(0);
  });

  it('generates recurring visits the first time a subscription is activated', async () => {
    const scheduler = recordingScheduler();
    await serviceWith(
      scheduler,
      null,
      fakeSubscription(SubscriptionStatus.PendingPayment),
    ).markPaid(PayableType.Subscription, 'sub-1');
    expect(scheduler.subscriptionCalls).toBe(1);
  });

  it('does not regenerate when a subscription is already active', async () => {
    const scheduler = recordingScheduler();
    await serviceWith(scheduler, null, fakeSubscription(SubscriptionStatus.Active)).markPaid(
      PayableType.Subscription,
      'sub-1',
    );
    expect(scheduler.subscriptionCalls).toBe(0);
  });
});
