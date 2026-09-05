import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  CARE_GOAL_REPOSITORY,
  CareGoalRepository,
} from '@modules/care-recipients/domain/care-goal.repository';
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
 * The caregiver roles (primary, backup, coordinator) and care instructions are
 * also office set, which is not built yet, so they are returned empty until that
 * surface exists. Owner scoped.
 */
@Injectable()
export class GetCarePlanUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(FAMILY_PLAN_DIRECTORY) private readonly plans: FamilyPlanDirectory,
    @Inject(CARE_GOAL_REPOSITORY) private readonly goals: CareGoalRepository,
    @Inject(CARE_ACCESS) private readonly access: CareAccessGuard,
  ) {}

  async execute(query: GetCarePlanQuery): Promise<CarePlanResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    await this.access.assertAccess(query.callerUserId, recipient.ownerId, CareAccessLevel.ViewOnly);

    const [planName, goals] = await Promise.all([
      this.plans.planNameForRecipient(recipient.ownerId, query.careRecipientId),
      this.goals.listForRecipient(query.careRecipientId),
    ]);

    return {
      planName,
      goals: goals.map((goal) => ({ label: goal.label, achieved: goal.achieved })),
      services: recipient.careNeeds.map((need) => SERVICE_LABEL[String(need)] ?? String(need)),
      schedule: this.buildSchedule(recipient),
      caregivers: { primary: null, backup: null, coordinator: null },
      careInstructions: null,
    };
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

/** Format minutes from midnight as a twelve hour clock time, for example 9:00 AM. */
function formatTimeOfDay(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}
