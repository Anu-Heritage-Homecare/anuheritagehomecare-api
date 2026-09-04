import { CareGoal } from './care-goal.entity';

/**
 * Persistence port for a care recipient's office set goals. Goals are captured as
 * a set, so the write replaces the recipient's goals wholesale.
 */
export interface CareGoalRepository {
  replaceForRecipient(careRecipientId: string, goals: CareGoal[]): Promise<void>;
  listForRecipient(careRecipientId: string): Promise<CareGoal[]>;
}

export const CARE_GOAL_REPOSITORY = Symbol('CARE_GOAL_REPOSITORY');
