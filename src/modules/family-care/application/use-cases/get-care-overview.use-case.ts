import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Visit } from '@modules/visits/domain/visit.entity';
import { CareAccessLevel } from '@modules/profile/domain/care-access-level.enum';
import { CARE_ACCESS, CareAccessGuard } from '@modules/profile/application/ports/care-access.port';
import { CareOverviewResult } from '../dto/care-section.result';
import { ageInYears, startOfUtcDay } from '../family-care-date.util';
import { pickCurrentVisit } from '../pick-current-visit.util';
import { FAMILY_PLAN_DIRECTORY, FamilyPlanDirectory } from '../ports/family-plan-directory.port';

export interface GetCareOverviewQuery {
  /** The authenticated caller: the owner, or a care circle member. */
  callerUserId: string;
  careRecipientId: string;
}

/**
 * Use case: the family owner's Care Overview for a recipient. Aggregates the
 * recipient card, their care plan name, the assigned caregiver on today's visit,
 * and the summary counts (tasks, medications, whether vitals exist, notes and
 * photos). Owner scoped.
 */
@Injectable()
export class GetCareOverviewUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(FAMILY_PLAN_DIRECTORY) private readonly plans: FamilyPlanDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CARE_ACCESS) private readonly access: CareAccessGuard,
  ) {}

  async execute(query: GetCareOverviewQuery): Promise<CareOverviewResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    await this.access.assertAccess(query.callerUserId, recipient.ownerId, CareAccessLevel.Limited);

    const now = this.clock.now();
    const day = startOfUtcDay(now);
    const todaysVisits = await this.visits.listForCareRecipientsInRange(
      [query.careRecipientId],
      day,
      day,
    );
    const visit = pickCurrentVisit(todaysVisits);

    const [carePlanName, caregiver] = await Promise.all([
      this.plans.planNameForRecipient(recipient.ownerId, query.careRecipientId),
      this.resolveCaregiver(visit),
    ]);

    return {
      recipient: {
        id: recipient.id,
        name: recipient.profile.name,
        gender: String(recipient.profile.gender),
        age: ageInYears(recipient.profile.dateOfBirth, now),
        photoKey: recipient.profile.photoKey,
      },
      carePlanName,
      caregiver,
      currentVisitId: visit?.id ?? null,
      summary: this.buildSummary(visit, recipient.medications.length),
    };
  }

  private async resolveCaregiver(
    visit: Visit | null,
  ): Promise<{ id: string; name: string } | null> {
    if (visit === null || visit.caregiverId === null) {
      return null;
    }
    const caregiverId = visit.caregiverId;
    const caregiver = await this.users.findById(caregiverId);
    return caregiver === null
      ? null
      : {
          id: caregiverId,
          name: `${caregiver.name.firstName} ${caregiver.name.lastName}`.trim(),
        };
  }

  private buildSummary(
    visit: Visit | null,
    medicationTotal: number,
  ): CareOverviewResult['summary'] {
    if (visit === null) {
      return {
        tasks: { completed: 0, total: 0 },
        medications: { completed: 0, total: medicationTotal },
        hasVitals: false,
        notesCount: 0,
        photosCount: 0,
      };
    }
    const medicationsGiven = visit.medicationAdministrations.filter(
      (administration) => String(administration.outcome) === 'ADMINISTERED',
    ).length;
    const notesCount = visit.notes.length;
    return {
      tasks: {
        completed: visit.tasks.filter((task) => task.completed).length,
        total: visit.tasks.length,
      },
      medications: { completed: medicationsGiven, total: medicationTotal },
      hasVitals: visit.vitals.length > 0,
      notesCount,
      photosCount: visit.photoKeys.length,
    };
  }
}
