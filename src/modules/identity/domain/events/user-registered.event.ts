import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/**
 * Raised when a new user account is registered but not yet verified. Downstream
 * handlers (for example sending the verification email) react to this fact
 * rather than coupling to the user aggregate directly.
 */
export class UserRegisteredEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'identity.user.registered';

  constructor(
    aggregateId: string,
    public readonly email: string,
  ) {
    super(aggregateId, UserRegisteredEvent.EVENT_NAME);
  }
}
