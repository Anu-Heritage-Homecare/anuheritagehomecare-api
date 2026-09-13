import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAction } from '@modules/care-recipients/domain/care-team-action.enum';
import { CareTeamAssignmentEvent } from '@modules/care-recipients/domain/care-team-assignment-event.entity';
import {
  CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY,
  CareTeamAssignmentEventRepository,
} from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface RemoveCaregiverCommand {
  recipientId: string;
  assignmentId: string;
  adminId: string;
  reason: string;
}

/**
 * Use case: the admin removes a caregiver from a recipient's team. The assignment
 * is marked removed (not deleted, so history is preserved), the change is logged,
 * and if the caregiver was the recipient's primary that pointer is cleared.
 */
@Injectable()
export class RemoveCaregiverUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CareTeamAssignmentRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY)
    private readonly history: CareTeamAssignmentEventRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: RemoveCaregiverCommand): Promise<{ id: string }> {
    const assignment = await this.assignments.findById(command.assignmentId);
    if (assignment === null || assignment.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Care team assignment not found');
    }

    const now = this.clock.now();
    assignment.remove(now);
    await this.assignments.save(assignment);

    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient !== null && recipient.primaryCaregiverId === assignment.caregiverId) {
      recipient.unassignPrimaryCaregiver(now);
      await this.recipients.save(recipient);
    }

    await this.history.add(
      CareTeamAssignmentEvent.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        caregiverId: assignment.caregiverId,
        action: CareTeamAction.Removed,
        reason: command.reason,
        byAdminId: command.adminId,
        now,
      }),
    );
    return { id: assignment.id };
  }
}
