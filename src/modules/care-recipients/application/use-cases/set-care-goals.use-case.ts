import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { CareGoal } from '../../domain/care-goal.entity';
import { CareGoalStatus } from '../../domain/care-goal-status.enum';
import { CARE_GOAL_REPOSITORY, CareGoalRepository } from '../../domain/care-goal.repository';

export interface SetCareGoalsCommand {
  careRecipientId: string;
  goals: { label: string; progressPercent: number; status: CareGoalStatus }[];
}

export interface CareGoalResult {
  label: string;
  progressPercent: number;
  status: CareGoalStatus;
  achieved: boolean;
}

/**
 * Use case: set (replace) the office defined care goals for a recipient. This is
 * the office capture path. Goals are stored in the order given, each with its
 * progress percent and status.
 */
@Injectable()
export class SetCareGoalsUseCase {
  constructor(
    @Inject(CARE_GOAL_REPOSITORY) private readonly goals: CareGoalRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetCareGoalsCommand): Promise<CareGoalResult[]> {
    const goals = command.goals.map((goal, index) =>
      CareGoal.create({
        id: this.ids.generate(),
        careRecipientId: command.careRecipientId,
        label: goal.label,
        progressPercent: goal.progressPercent,
        status: goal.status,
        position: index,
      }),
    );

    await this.goals.replaceForRecipient(command.careRecipientId, goals);

    return goals.map((goal) => ({
      label: goal.label,
      progressPercent: goal.progressPercent,
      status: goal.status,
      achieved: goal.achieved,
    }));
  }
}
