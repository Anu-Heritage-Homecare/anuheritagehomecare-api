import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/** Raised when a Flexible booking is created and awaiting payment. */
export class BookingCreatedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'bookings.booking.created';

  constructor(
    aggregateId: string,
    public readonly ownerId: string,
  ) {
    super(aggregateId, BookingCreatedEvent.EVENT_NAME);
  }
}
