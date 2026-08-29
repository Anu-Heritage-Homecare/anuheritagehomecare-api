import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Visit } from '@modules/visits/domain/visit.entity';
import { FamilyVisitsResult, FamilyVisitSummaryResult } from '../dto/family-visit.result';

export interface GetRecipientVisitsQuery {
  ownerId: string;
  careRecipientId: string;
}

// A wide window that covers a recipient's visit history and near future.
const HISTORY_FROM = new Date('2000-01-01T00:00:00.000Z');
const FUTURE_TO = new Date('2100-01-01T00:00:00.000Z');
const ACTIVE = new Set(['IN_PROGRESS', 'ON_BREAK']);

/**
 * Use case: the visits list a family owner sees for one of their recipients: the
 * current visit (in progress, or next scheduled) and the past visits. The
 * recipient must belong to the owner, otherwise it is reported as not found.
 */
@Injectable()
export class GetRecipientVisitsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(query: GetRecipientVisitsQuery): Promise<FamilyVisitsResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null || recipient.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const visits = await this.visits.listForCareRecipientsInRange(
      [query.careRecipientId],
      HISTORY_FROM,
      FUTURE_TO,
    );

    const caregiverIds = [...new Set(visits.map((visit) => visit.caregiverId))];
    const caregivers = await this.users.findByIds(caregiverIds);
    const caregiverById = new Map(
      caregivers.map((user) => [
        user.id,
        { name: `${user.name.firstName} ${user.name.lastName}`.trim(), photoKey: user.photoKey },
      ]),
    );

    const summaries = visits.map((visit) => this.toSummary(visit, caregiverById));
    const current =
      summaries.find((visit) => ACTIVE.has(visit.status)) ??
      summaries.find((visit) => visit.status === 'SCHEDULED') ??
      null;
    const pastVisits = summaries
      .filter((visit) => visit.status === 'COMPLETED')
      .sort((a, b) => this.chronologyKey(b) - this.chronologyKey(a));

    return { currentVisit: current, pastVisits };
  }

  private toSummary(
    visit: Visit,
    caregiverById: Map<string, { name: string; photoKey: string | null }>,
  ): FamilyVisitSummaryResult {
    const caregiver = caregiverById.get(visit.caregiverId);
    return {
      id: visit.id,
      status: String(visit.status),
      date: visit.scheduledDate.toISOString().slice(0, 10),
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
      clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
      caregiver:
        caregiver === undefined
          ? null
          : { id: visit.caregiverId, name: caregiver.name, photoKey: caregiver.photoKey },
    };
  }

  private chronologyKey(visit: FamilyVisitSummaryResult): number {
    return new Date(visit.date).getTime() + visit.startMinute * 60_000;
  }
}
