import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/**
 * Raised when a user verifies their email address and the account becomes
 * active. Downstream handlers (welcome messaging, onboarding) subscribe to this.
 */
export class UserEmailVerifiedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'identity.user.email_verified';

  constructor(
    aggregateId: string,
    public readonly email: string,
  ) {
    super(aggregateId, UserEmailVerifiedEvent.EVENT_NAME);
  }
}
