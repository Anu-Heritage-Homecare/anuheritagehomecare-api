import { HealthEvent } from './health-event.entity';

/**
 * Persistence port for a recipient's health timeline. Append only from the domain:
 * an event is recorded and never mutated. The paginated, filtered reads for the
 * admin screen live in a dedicated read model, not here.
 */
export interface HealthEventRepository {
  add(event: HealthEvent): Promise<void>;
}

export const HEALTH_EVENT_REPOSITORY = Symbol('HEALTH_EVENT_REPOSITORY');
