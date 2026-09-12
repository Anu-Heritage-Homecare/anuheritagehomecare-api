import { Inject, Injectable } from '@nestjs/common';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { CARE_ACTIVITY_DIRECTORY, CareActivityDirectory } from '../ports/care-activity.port';
import {
  CARE_RECIPIENT_READ_MODEL,
  CareRecipientListQuery,
  CareRecipientReadModel,
  CareRecipientRowView,
} from '../ports/care-recipient-read.port';
import { CareRecipientListItem, CareRecipientListResult } from '../dto/care-recipient-list.result';

/** A recipient added within this many days still counts as New. */
const NEW_WINDOW_DAYS = 14;
const MS_PER_DAY = 86_400_000;

/** Map the care schedule frequency onto the care level shown on the admin list. */
const CARE_LEVEL: Record<CareFrequency, string> = {
  [CareFrequency.LiveInCare]: '24-Hour',
  [CareFrequency.Daily]: 'Full-Time',
  [CareFrequency.Weekly]: 'Part-Time',
  [CareFrequency.OneTimeVisit]: 'Hourly',
};

export interface ListCareRecipientsQuery {
  tab: CareRecipientListQuery['tab'];
  search: string | null;
  sortField: CareRecipientListQuery['sortField'];
  sortDirection: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

/**
 * Use case: assemble the admin Care Recipients screen. Reads a filtered, sorted,
 * paginated page from the read model, enriches each row with the assigned
 * caregiver name (identity) and the last visit (visits), and computes the summary
 * cards, filter tab counts and action triggers. Drafts (mid onboarding) are
 * excluded throughout.
 */
@Injectable()
export class ListCareRecipientsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_READ_MODEL) private readonly recipients: CareRecipientReadModel,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CARE_ACTIVITY_DIRECTORY) private readonly activity: CareActivityDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: ListCareRecipientsQuery): Promise<CareRecipientListResult> {
    const now = this.clock.now();
    const newSince = new Date(now.getTime() - NEW_WINDOW_DAYS * MS_PER_DAY);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [page, counts, overdueVisit] = await Promise.all([
      this.recipients.listPage({ ...query, newSince }),
      this.recipients.counts(monthStart, newSince),
      this.activity.countRecipientsWithOverdueVisit(now),
    ]);

    const caregiverIds = [
      ...new Set(
        page.rows.map((r) => r.primaryCaregiverId).filter((id): id is string => id !== null),
      ),
    ];
    const [caregivers, latestVisits] = await Promise.all([
      this.users.findByIds(caregiverIds),
      this.activity.latestVisitByRecipients(page.rows.map((r) => r.id)),
    ]);
    const caregiverName = new Map(caregivers.map((u) => [u.id, u.name.fullName]));

    const items = page.rows.map((row) =>
      this.toItem(row, caregiverName, latestVisits, newSince, now),
    );
    const totalPages = query.pageSize > 0 ? Math.ceil(page.total / query.pageSize) : 0;
    const activePercent = counts.total === 0 ? 0 : Math.round((counts.active / counts.total) * 100);

    return {
      summary: {
        total: counts.total,
        active: counts.active,
        onHold: counts.onHold,
        discharged: counts.discharged,
        newThisMonth: counts.newThisMonth,
        activePercent,
      },
      tabs: {
        all: counts.total,
        active: counts.active,
        onHold: counts.onHold,
        highPriority: counts.highPriority,
        newlyAdded: counts.newCount,
      },
      actionTriggers: {
        // Needs attention: the most urgent recipients (critical or urgent priority).
        needsAttention: counts.highPriority,
        missingCarePlan: counts.missingCarePlan,
        overdueVisit,
      },
      items,
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages,
    };
  }

  private toItem(
    row: CareRecipientRowView,
    caregiverName: Map<string, string>,
    latestVisits: Map<string, Date>,
    newSince: Date,
    now: Date,
  ): CareRecipientListItem {
    const isNew =
      row.status === CareRecipientStatus.Active && row.createdAt.getTime() >= newSince.getTime();
    return {
      id: row.id,
      code: `CR-${String(row.recipientNumber).padStart(3, '0')}`,
      name: row.name,
      photoKey: row.photoKey,
      age: ageInYears(row.dateOfBirth, now),
      primaryCondition: row.medicalConditions[0] ?? null,
      careLevel: row.careFrequency === null ? null : CARE_LEVEL[row.careFrequency],
      assignedCaregiverName:
        row.primaryCaregiverId === null
          ? null
          : (caregiverName.get(row.primaryCaregiverId) ?? null),
      status: isNew ? 'NEW' : String(row.status),
      priority: this.priorityLabel(row.priority),
      lastVisitAt: latestVisits.get(row.id) ?? null,
    };
  }

  private priorityLabel(priority: CareRecipientPriority): string {
    return String(priority);
  }
}

/** Whole years between a date of birth and the given current date. */
function ageInYears(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}
