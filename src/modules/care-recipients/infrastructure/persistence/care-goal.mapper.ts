import { CareGoal as PrismaCareGoal } from '@prisma/client';
import { CareGoal } from '../../domain/care-goal.entity';

/** Translates between the Prisma care goal row and the domain entity. */
export class CareGoalMapper {
  static toDomain(row: PrismaCareGoal): CareGoal {
    return CareGoal.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      label: row.label,
      achieved: row.achieved,
      position: row.position,
    });
  }

  static toPersistence(goal: CareGoal): {
    id: string;
    careRecipientId: string;
    label: string;
    achieved: boolean;
    position: number;
  } {
    return {
      id: goal.id,
      careRecipientId: goal.careRecipientId,
      label: goal.label,
      achieved: goal.achieved,
      position: goal.position,
    };
  }
}
