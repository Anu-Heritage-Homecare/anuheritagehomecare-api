import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CarePlanResult } from '../dto/care-section.result';
import { FAMILY_PLAN_DIRECTORY, FamilyPlanDirectory } from '../ports/family-plan-directory.port';

export interface GetCarePlanQuery {
  ownerId: string;
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
 * schedule from their care schedule. Care goals, the caregiver roles (primary,
 * backup, coordinator) and care instructions are set by the office, which is not
 * built yet, so they are returned empty until that surface exists. Owner scoped.
 */
@Injectable()
export class GetCarePlanUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(FAMILY_PLAN_DIRECTORY) private readonly plans: FamilyPlanDirectory,
  ) {}

  async execute(query: GetCarePlanQuery): Promise<CarePlanResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null || recipient.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const planName = await this.plans.planNameForRecipient(query.ownerId, query.careRecipientId);

    return {
      planName,
      goals: [],
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
    };
  }
}
