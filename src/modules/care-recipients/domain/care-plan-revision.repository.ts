import { CarePlanRevision } from './care-plan-revision.entity';

/**
 * Persistence port for a care plan's revision history. Append only: a revision is
 * added when the plan changes and never mutated; reads return the most recent
 * first.
 */
export interface CarePlanRevisionRepository {
  add(revision: CarePlanRevision): Promise<void>;
  listForRecipient(careRecipientId: string, limit: number): Promise<CarePlanRevision[]>;
}

export const CARE_PLAN_REVISION_REPOSITORY = Symbol('CARE_PLAN_REVISION_REPOSITORY');
