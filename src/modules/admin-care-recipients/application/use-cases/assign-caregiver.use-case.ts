import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAction } from '@modules/care-recipients/domain/care-team-action.enum';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import { CareTeamAssignmentEvent } from '@modules/care-recipients/domain/care-team-assignment-event.entity';
import {
  CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY,
  CareTeamAssignmentEventRepository,
} from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AssignCaregiverCommand {
  recipientId: string;
  adminId: string;
  caregiverId: string;
  role: CareTeamRole;
  specialization?: string | null;
  scheduleLabel?: string | null;
  reason: string;
}

/**
 * Use case: the admin assigns a caregiver to a recipient's care team in a role. The
 * assignment is recorded, the change is logged to the assignment history, and when
 * the role is primary the recipient's primary caregiver pointer is kept in sync so
 * the other screens that read it stay correct.
 */
@Injectable()
export class AssignCaregiverUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CareTeamAssignmentRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY)
    private readonly history: CareTeamAssignmentEventRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AssignCaregiverCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const assignment = CareTeamAssignment.assign({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      caregiverId: command.caregiverId,
      role: command.role,
      specialization: command.specialization,
      scheduleLabel: command.scheduleLabel,
      now,
    });
    await this.assignments.add(assignment);

    if (command.role === CareTeamRole.Primary) {
      recipient.assignPrimaryCaregiver(command.caregiverId, now);
      await this.recipients.save(recipient);
    }

    await this.history.add(
      CareTeamAssignmentEvent.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        caregiverId: command.caregiverId,
        action: CareTeamAction.Assigned,
        reason: command.reason,
        byAdminId: command.adminId,
        now,
      }),
    );
    return { id: assignment.id };
  }
}
