import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { ManagedCarePlan } from './managed-care-plan.entity';

/**
 * Persistence port for the ManagedCarePlan aggregate. Saving also appends any new
 * version entries recorded on the aggregate.
 */
export interface ManagedCarePlanRepository {
  save(plan: ManagedCarePlan): Promise<void>;
  findById(id: string): Promise<ManagedCarePlan | null>;
  findByCoreType(coreType: CarePlanType): Promise<ManagedCarePlan | null>;
  listAll(includeArchived: boolean): Promise<ManagedCarePlan[]>;
}

export const MANAGED_CARE_PLAN_REPOSITORY = Symbol('MANAGED_CARE_PLAN_REPOSITORY');
