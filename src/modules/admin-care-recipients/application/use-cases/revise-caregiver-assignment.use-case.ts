import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface ReviseCaregiverAssignmentCommand {
  recipientId: string;
  assignmentId: string;
  role?: CareTeamRole;
  specialization?: string | null;
  scheduleLabel?: string | null;
}

/**
 * Use case: the admin edits an existing care team assignment (its role,
 * specialization or working schedule). Promoting a caregiver to primary keeps the
 * recipient's primary caregiver pointer in sync.
 */
@Injectable()
export class ReviseCaregiverAssignmentUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CareTeamAssignmentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ReviseCaregiverAssignmentCommand): Promise<{ id: string }> {
    const assignment = await this.assignments.findById(command.assignmentId);
    if (assignment === null || assignment.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Care team assignment not found');
    }

    assignment.revise({
      role: command.role,
      specialization: command.specialization,
      scheduleLabel: command.scheduleLabel,
    });
    await this.assignments.save(assignment);

    if (command.role === CareTeamRole.Primary) {
      const recipient = await this.recipients.findById(command.recipientId);
      if (recipient !== null) {
        recipient.assignPrimaryCaregiver(assignment.caregiverId, this.clock.now());
        await this.recipients.save(recipient);
      }
    }
    return { id: assignment.id };
  }
}
