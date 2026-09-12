import { CareGoal as PrismaCareGoal, CareGoalStatus as PrismaGoalStatus } from '@prisma/client';
import { CareGoal } from '../../domain/care-goal.entity';
import { CareGoalStatus } from '../../domain/care-goal-status.enum';

const TO_DOMAIN_STATUS: Record<PrismaGoalStatus, CareGoalStatus> = {
  ON_TRACK: CareGoalStatus.OnTrack,
  NEEDS_ATTENTION: CareGoalStatus.NeedsAttention,
  AT_RISK: CareGoalStatus.AtRisk,
  ACHIEVED: CareGoalStatus.Achieved,
};

const TO_PERSISTENCE_STATUS: Record<CareGoalStatus, PrismaGoalStatus> = {
  [CareGoalStatus.OnTrack]: 'ON_TRACK',
  [CareGoalStatus.NeedsAttention]: 'NEEDS_ATTENTION',
  [CareGoalStatus.AtRisk]: 'AT_RISK',
  [CareGoalStatus.Achieved]: 'ACHIEVED',
};

/** Translates between the Prisma care goal row and the domain entity. */
export class CareGoalMapper {
  static toDomain(row: PrismaCareGoal): CareGoal {
    return CareGoal.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      label: row.label,
      achieved: row.achieved,
      progressPercent: row.progressPercent,
      status: TO_DOMAIN_STATUS[row.status],
      position: row.position,
    });
  }

  static toPersistence(goal: CareGoal): {
    id: string;
    careRecipientId: string;
    label: string;
    achieved: boolean;
    progressPercent: number;
    status: PrismaGoalStatus;
    position: number;
  } {
    return {
      id: goal.id,
      careRecipientId: goal.careRecipientId,
      label: goal.label,
      achieved: goal.achieved,
      progressPercent: goal.progressPercent,
      status: TO_PERSISTENCE_STATUS[goal.status],
      position: goal.position,
    };
  }
}
