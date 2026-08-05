/**
 * Marker contract for Domain Events. A domain event records something that has
 * already happened inside a bounded context. Events are immutable facts.
 */
export interface DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly eventName: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly occurredAt: Date;

  protected constructor(
    public readonly aggregateId: string,
    public readonly eventName: string,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
