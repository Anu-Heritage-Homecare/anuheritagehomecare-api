import { Inject, Injectable } from '@nestjs/common';
import { CareGoalStatus } from '@modules/care-recipients/domain/care-goal-status.enum';
import { CarePlanRevision } from '@modules/care-recipients/domain/care-plan-revision.entity';
import {
  CARE_PLAN_REVISION_REPOSITORY,
  CarePlanRevisionRepository,
} from '@modules/care-recipients/domain/care-plan-revision.repository';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { SetCareGoalsUseCase } from '@modules/care-recipients/application/use-cases/set-care-goals.use-case';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetCarePlanGoalsCommand {
  recipientId: string;
  adminId: string;
  revisionNote?: string;
  goals: { label: string; progressPercent: number; status: CareGoalStatus }[];
}

/**
 * Use case: replace a recipient's care goals from the admin care plan editor and
 * record a revision attributed to the admin who made the change.
 */
@Injectable()
export class SetCarePlanGoalsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    private readonly setGoals: SetCareGoalsUseCase,
    @Inject(CARE_PLAN_REVISION_REPOSITORY) private readonly revisions: CarePlanRevisionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetCarePlanGoalsCommand): Promise<{ goalCount: number }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    const goals = await this.setGoals.execute({
      careRecipientId: command.recipientId,
      goals: command.goals,
    });
    await this.revisions.add(
      CarePlanRevision.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        description: command.revisionNote?.trim() || 'Care goals updated',
        authorAdminId: command.adminId,
        now: this.clock.now(),
      }),
    );
    return { goalCount: goals.length };
  }
}
