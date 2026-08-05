import { BaseDomainEvent } from '@shared/domain/domain-event.base';

/**
 * Raised when a new client is registered. Downstream handlers (notifications,
 * onboarding, analytics) subscribe to this fact rather than coupling to the
 * client aggregate directly.
 */
export class ClientRegisteredEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'clients.client.registered';

  constructor(
    aggregateId: string,
    public readonly email: string,
  ) {
    super(aggregateId, ClientRegisteredEvent.EVENT_NAME);
  }
}
