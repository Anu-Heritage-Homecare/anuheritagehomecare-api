import { CarePlanScheduleBlock } from './care-plan-schedule-block.entity';

/**
 * Persistence port for a recipient's daily care schedule. Blocks are captured as a
 * set, so the write replaces the recipient's blocks wholesale.
 */
export interface CarePlanScheduleRepository {
  replaceForRecipient(careRecipientId: string, blocks: CarePlanScheduleBlock[]): Promise<void>;
  listForRecipient(careRecipientId: string): Promise<CarePlanScheduleBlock[]>;
}

export const CARE_PLAN_SCHEDULE_REPOSITORY = Symbol('CARE_PLAN_SCHEDULE_REPOSITORY');
