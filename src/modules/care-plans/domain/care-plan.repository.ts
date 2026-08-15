import { CarePlan } from './care-plan.entity';
import { CarePlanType } from './care-plan-type.enum';

/**
 * Read port for the care plan catalog. Declared in the domain; infrastructure
 * supplies the Prisma adapter. The catalog is reference data, so the port is
 * read only for now (seeding populates it; an admin module may edit it later).
 */
export interface CarePlanRepository {
  findByType(type: CarePlanType): Promise<CarePlan | null>;
  findAllActive(): Promise<CarePlan[]>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const CARE_PLAN_REPOSITORY = Symbol('CARE_PLAN_REPOSITORY');
