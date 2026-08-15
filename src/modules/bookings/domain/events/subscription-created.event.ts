import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/** Raised when a monthly subscription is created and awaiting its first payment. */
export class SubscriptionCreatedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'bookings.subscription.created';

  constructor(
    aggregateId: string,
    public readonly ownerId: string,
  ) {
    super(aggregateId, SubscriptionCreatedEvent.EVENT_NAME);
  }
}
