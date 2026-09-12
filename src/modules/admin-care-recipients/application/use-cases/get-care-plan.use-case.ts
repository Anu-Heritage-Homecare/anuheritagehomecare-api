import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  AdminUserRepository,
} from '@modules/admin-identity/domain/admin-user.repository';
import { CareInstructionCategory } from '@modules/care-recipients/domain/care-instruction.enums';
import {
  CARE_INSTRUCTION_REPOSITORY,
  CareInstructionRepository,
} from '@modules/care-recipients/domain/care-instruction.repository';
import {
  CARE_PLAN_REVISION_REPOSITORY,
  CarePlanRevisionRepository,
} from '@modules/care-recipients/domain/care-plan-revision.repository';
import {
  CARE_PLAN_SCHEDULE_REPOSITORY,
  CarePlanScheduleRepository,
} from '@modules/care-recipients/domain/care-plan-schedule-block.repository';
import {
  CARE_GOAL_REPOSITORY,
  CareGoalRepository,
} from '@modules/care-recipients/domain/care-goal.repository';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CarePlanInstructionResult, CarePlanResult } from '../dto/care-plan.result';

const REVISION_LIMIT = 20;

/**
 * Use case: read a care recipient's care plan (goals with progress and status, the
 * daily schedule, care instructions split into medical needs and behavioral notes,
 * and the revision history with each change attributed to the admin who made it).
 */
@Injectable()
export class GetCarePlanUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_GOAL_REPOSITORY) private readonly goals: CareGoalRepository,
    @Inject(CARE_PLAN_SCHEDULE_REPOSITORY) private readonly schedule: CarePlanScheduleRepository,
    @Inject(CARE_INSTRUCTION_REPOSITORY) private readonly instructions: CareInstructionRepository,
    @Inject(CARE_PLAN_REVISION_REPOSITORY) private readonly revisions: CarePlanRevisionRepository,
    @Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository,
  ) {}

  async execute(recipientId: string): Promise<CarePlanResult> {
    const recipient = await this.recipients.findById(recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const [goals, blocks, instructions, revisions] = await Promise.all([
      this.goals.listForRecipient(recipientId),
      this.schedule.listForRecipient(recipientId),
      this.instructions.listForRecipient(recipientId),
      this.revisions.listForRecipient(recipientId, REVISION_LIMIT),
    ]);

    const authorIds = [
      ...new Set(revisions.map((r) => r.authorAdminId).filter((id): id is string => id !== null)),
    ];
    const authorName = new Map<string, string>();
    for (const id of authorIds) {
      const admin = await this.admins.findById(id);
      if (admin !== null) {
        authorName.set(id, admin.name.fullName);
      }
    }

    const medical: CarePlanInstructionResult[] = [];
    const behavioral: CarePlanInstructionResult[] = [];
    for (const instruction of instructions) {
      const item = { text: instruction.text, severity: String(instruction.severity) };
      if (instruction.category === CareInstructionCategory.Behavioral) {
        behavioral.push(item);
      } else {
        medical.push(item);
      }
    }

    return {
      goals: goals.map((g) => ({
        label: g.label,
        progressPercent: g.progressPercent,
        status: String(g.status),
      })),
      schedule: blocks.map((b) => ({
        startMinute: b.startMinute,
        title: b.title,
        description: b.description,
      })),
      instructions: { medical, behavioral },
      revisions: revisions.map((r) => ({
        at: r.createdAt,
        description: r.description,
        authorName: r.authorAdminId === null ? null : (authorName.get(r.authorAdminId) ?? null),
      })),
    };
  }
}
