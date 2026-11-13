import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Visit } from '@modules/visits/domain/visit.entity';
import { CareAccessLevel } from '@modules/profile/domain/care-access-level.enum';
import { CARE_ACCESS, CareAccessGuard } from '@modules/profile/application/ports/care-access.port';
import { FamilyVisitsResult, FamilyVisitSummaryResult } from '../dto/family-visit.result';

export const DEFAULT_PAST_VISITS_PAGE_SIZE = 20;
export const MAX_PAST_VISITS_PAGE_SIZE = 50;

export interface GetRecipientVisitsQuery {
  /** The authenticated caller: the owner, or a care circle member. */
  callerUserId: string;
  careRecipientId: string;
  /** Page over the past (completed) visits; defaults to the first page. */
  page?: number;
  pageSize?: number;
}

/**
 * Use case: the visits list a family owner sees for one of their recipients: the
 * current visit (in progress, or next scheduled) and the past visits. The
 * recipient must belong to the owner, otherwise it is reported as not found. The
 * past visits are paginated so the query is bounded instead of fetching the whole
 * history.
 */
@Injectable()
export class GetRecipientVisitsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CARE_ACCESS) private readonly access: CareAccessGuard,
  ) {}

  async execute(query: GetRecipientVisitsQuery): Promise<FamilyVisitsResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    await this.access.assertAccess(query.callerUserId, recipient.ownerId, CareAccessLevel.Limited);

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(
      MAX_PAST_VISITS_PAGE_SIZE,
      Math.max(1, query.pageSize ?? DEFAULT_PAST_VISITS_PAGE_SIZE),
    );

    const [current, past] = await Promise.all([
      this.visits.findCurrentForCareRecipient(query.careRecipientId),
      this.visits.listCompletedForCareRecipient(
        query.careRecipientId,
        pageSize,
        (page - 1) * pageSize,
      ),
    ]);

    const relevant = [current, ...past.visits].filter((visit): visit is Visit => visit !== null);
    const caregiverIds = [
      ...new Set(
        relevant.map((visit) => visit.caregiverId).filter((id): id is string => id !== null),
      ),
    ];
    const caregivers = await this.users.findByIds(caregiverIds);
    const caregiverById = new Map(
      caregivers.map((user) => [
        user.id,
        { name: `${user.name.firstName} ${user.name.lastName}`.trim(), photoKey: user.photoKey },
      ]),
    );

    return {
      currentVisit: current === null ? null : this.toSummary(current, caregiverById),
      pastVisits: past.visits.map((visit) => this.toSummary(visit, caregiverById)),
      pagination: { page, pageSize, total: past.total },
    };
  }

  private toSummary(
    visit: Visit,
    caregiverById: Map<string, { name: string; photoKey: string | null }>,
  ): FamilyVisitSummaryResult {
    const caregiverId = visit.caregiverId;
    const caregiver = caregiverId === null ? undefined : caregiverById.get(caregiverId);
    return {
      id: visit.id,
      status: String(visit.status),
      date: visit.scheduledDate.toISOString().slice(0, 10),
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
      clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
      caregiver:
        caregiverId === null || caregiver === undefined
          ? null
          : { id: caregiverId, name: caregiver.name, photoKey: caregiver.photoKey },
    };
  }
}
