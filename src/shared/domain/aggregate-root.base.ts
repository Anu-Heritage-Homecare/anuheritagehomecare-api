import { DomainEvent } from './domain-event.base';
import { Entity } from './entity.base';

/**
 * Base class for Aggregate Roots. An aggregate root is the single entry point
 * into an aggregate and guards its invariants. It records domain events that
 * the application layer publishes after the aggregate is persisted.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  public get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
