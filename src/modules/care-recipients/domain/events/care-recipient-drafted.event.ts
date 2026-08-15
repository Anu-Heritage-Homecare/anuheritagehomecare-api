import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/**
 * Raised when a family owner starts a care recipient onboarding draft. The
 * record exists but is not yet finalised.
 */
export class CareRecipientDraftedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'careRecipients.draft.started';

  constructor(
    aggregateId: string,
    public readonly ownerId: string,
  ) {
    super(aggregateId, CareRecipientDraftedEvent.EVENT_NAME);
  }
}
