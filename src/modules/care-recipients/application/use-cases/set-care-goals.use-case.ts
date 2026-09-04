import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { CareGoal } from '../../domain/care-goal.entity';
import { CARE_GOAL_REPOSITORY, CareGoalRepository } from '../../domain/care-goal.repository';

export interface SetCareGoalsCommand {
  careRecipientId: string;
  goals: { label: string; achieved: boolean }[];
}

export interface CareGoalResult {
  label: string;
  achieved: boolean;
}

/**
 * Use case: set (replace) the office defined care goals for a recipient. This is
 * the office capture path, exported for the future admin surface rather than
 * exposed to the family app (goals are read only there). Goals are stored in the
 * order given.
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
        achieved: goal.achieved,
        position: index,
      }),
    );

    await this.goals.replaceForRecipient(command.careRecipientId, goals);

    return goals.map((goal) => ({ label: goal.label, achieved: goal.achieved }));
  }
}
