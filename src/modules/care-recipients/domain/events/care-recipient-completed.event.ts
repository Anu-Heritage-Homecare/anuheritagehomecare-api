import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/**
 * Raised when a family owner finalises a care recipient's onboarding and the
 * record becomes active. Downstream contexts (scheduling, matching) can react to
 * this fact without coupling to the aggregate.
 */
export class CareRecipientCompletedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'careRecipients.onboarding.completed';

  constructor(
    aggregateId: string,
    public readonly ownerId: string,
  ) {
    super(aggregateId, CareRecipientCompletedEvent.EVENT_NAME);
  }
}
