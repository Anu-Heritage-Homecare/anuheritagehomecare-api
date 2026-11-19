import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  CARE_GOAL_REPOSITORY,
  CareGoalRepository,
} from '@modules/care-recipients/domain/care-goal.repository';
import {
  CARE_INSTRUCTION_REPOSITORY,
  CareInstructionRepository,
} from '@modules/care-recipients/domain/care-instruction.repository';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { WEEKDAY_SHORT_LABEL } from '@modules/care-recipients/domain/weekday.enum';
import { CareAccessLevel } from '@modules/profile/domain/care-access-level.enum';
import { CARE_ACCESS, CareAccessGuard } from '@modules/profile/application/ports/care-access.port';
import { CarePlanResult } from '../dto/care-section.result';
import { FAMILY_PLAN_DIRECTORY, FamilyPlanDirectory } from '../ports/family-plan-directory.port';

export interface GetCarePlanQuery {
  /** The authenticated caller: the owner, or a care circle member. */
  callerUserId: string;
  careRecipientId: string;
}

// Care needs the recipient captured at onboarding, mapped to service labels.
const SERVICE_LABEL: Record<string, string> = {
  BATHING: 'Bathing',
  DRESSING: 'Dressing',
  GROOMING: 'Grooming',
  TOILETING: 'Toileting',
  MEAL_PREPARATION: 'Meal Prep',
  HOUSEKEEPING: 'Housekeeping',
  LAUNDRY: 'Laundry',
  SHOPPING: 'Shopping',
};

/**
 * Use case: the recipient's care plan. The plan name comes from their booking and
 * the included services from the care needs captured at onboarding; the visit
 * schedule from their care schedule; the care goals from the office set goal list.
 * The care team (primary, backup, coordinator) comes from the office set role
 * assignments and the care instructions from the office set instruction list.
 * Owner scoped.
 */
@Injectable()
export class GetCarePlanUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(FAMILY_PLAN_DIRECTORY) private readonly plans: FamilyPlanDirectory,
    @Inject(CARE_GOAL_REPOSITORY) private readonly goals: CareGoalRepository,
    @Inject(CARE_INSTRUCTION_REPOSITORY) private readonly instructions: CareInstructionRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly careTeam: CareTeamAssignmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CARE_ACCESS) private readonly access: CareAccessGuard,
  ) {}

  async execute(query: GetCarePlanQuery): Promise<CarePlanResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    await this.access.assertAccess(query.callerUserId, recipient.ownerId, CareAccessLevel.ViewOnly);

    const [planName, goals, instructions, assignments] = await Promise.all([
      this.plans.planNameForRecipient(recipient.ownerId, query.careRecipientId),
      this.goals.listForRecipient(query.careRecipientId),
      this.instructions.listForRecipient(query.careRecipientId),
      this.careTeam.listActiveForRecipient(query.careRecipientId),
    ]);

    // Primary comes from the recipient's synced pointer (which also tracks a
    // primary set directly); backup and coordinator from the active assignments.
    const roleFor = (role: CareTeamRole): string | null =>
      assignments.find((assignment) => assignment.role === role)?.caregiverId ?? null;
    const primaryId = recipient.primaryCaregiverId;
    const backupId = roleFor(CareTeamRole.Backup);
    const coordinatorId = roleFor(CareTeamRole.Coordinator);
    const names = await this.resolveNames([primaryId, backupId, coordinatorId]);

    return {
      planName,
      goals: goals.map((goal) => ({ label: goal.label, achieved: goal.achieved })),
      services: recipient.careNeeds.map((need) => SERVICE_LABEL[String(need)] ?? String(need)),
      schedule: this.buildSchedule(recipient),
      caregivers: {
        primary: toMember(primaryId, names),
        backup: toMember(backupId, names),
        coordinator: toMember(coordinatorId, names),
      },
      careInstructions:
        instructions.length === 0
          ? null
          : instructions.map((instruction) => instruction.text).join('\n'),
    };
  }

  /** Resolve the caregiver ids to display names in a single batched lookup. */
  private async resolveNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    if (unique.length === 0) {
      return new Map();
    }
    const users = await this.users.findByIds(unique);
    return new Map(
      users.map((user) => [user.id, `${user.name.firstName} ${user.name.lastName}`.trim()]),
    );
  }

  private buildSchedule(recipient: CareRecipient): CarePlanResult['schedule'] {
    const schedule = recipient.schedule;
    if (schedule === null) {
      return null;
    }
    return {
      frequency: String(schedule.frequency),
      startDate: schedule.estimatedStartDate.toISOString().slice(0, 10),
      expectedDuration: schedule.expectedDuration,
      days: schedule.days.map((day) => WEEKDAY_SHORT_LABEL[day]),
      startTime: schedule.startMinute === null ? null : formatTimeOfDay(schedule.startMinute),
      visitDurationHours:
        schedule.visitDurationMinutes === null ? null : schedule.visitDurationMinutes / 60,
    };
  }
}

/** A care team member for the response, or null when unassigned or unresolved. */
function toMember(
  id: string | null,
  names: Map<string, string>,
): { id: string; name: string } | null {
  if (id === null) {
    return null;
  }
  const name = names.get(id);
  return name === undefined ? null : { id, name };
}

/** Format minutes from midnight as a twelve hour clock time, for example 9:00 AM. */
function formatTimeOfDay(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}
