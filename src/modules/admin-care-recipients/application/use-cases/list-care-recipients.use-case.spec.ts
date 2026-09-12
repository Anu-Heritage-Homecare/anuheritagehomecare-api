import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { CareActivityDirectory } from '../ports/care-activity.port';
import {
  CareRecipientCountsView,
  CareRecipientPageView,
  CareRecipientReadModel,
  CareRecipientRowView,
} from '../ports/care-recipient-read.port';
import { ListCareRecipientsUseCase } from './list-care-recipients.use-case';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function row(overrides: Partial<CareRecipientRowView>): CareRecipientRowView {
  return {
    id: 'r1',
    recipientNumber: 1,
    name: 'Margaret Johnson',
    photoKey: null,
    dateOfBirth: new Date('1947-05-01T00:00:00.000Z'),
    medicalConditions: ["Alzheimer's Disease"],
    careFrequency: CareFrequency.LiveInCare,
    status: CareRecipientStatus.Active,
    priority: CareRecipientPriority.High,
    primaryCaregiverId: 'cg-1',
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const counts: CareRecipientCountsView = {
  total: 342,
  active: 298,
  onHold: 31,
  discharged: 13,
  newThisMonth: 8,
  highPriority: 24,
  newCount: 12,
  missingCarePlan: 3,
};

function makeReadModel(page: CareRecipientPageView): CareRecipientReadModel {
  return {
    listPage: () => Promise.resolve(page),
    counts: () => Promise.resolve(counts),
  };
}

const activity: CareActivityDirectory = {
  latestVisitByRecipients: () =>
    Promise.resolve(new Map([['r1', new Date('2026-09-15T09:30:00.000Z')]])),
  countRecipientsWithOverdueVisit: () => Promise.resolve(5),
};

const users: UserRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  findByIds: (ids: string[]) =>
    Promise.resolve(
      ids.map((id) => ({ id, name: { fullName: 'Sarah Williams' } }) as unknown as User),
    ),
  findByEmail: () => Promise.resolve(null),
  existsByEmail: () => Promise.resolve(false),
  existsByPhone: () => Promise.resolve(false),
  countByType: () => Promise.resolve(0),
};

function make(page: CareRecipientPageView): ListCareRecipientsUseCase {
  return new ListCareRecipientsUseCase(makeReadModel(page), users, activity, clock);
}

const baseQuery = {
  tab: 'ALL' as const,
  search: null,
  sortField: 'NAME' as const,
  sortDirection: 'ASC' as const,
  page: 1,
  pageSize: 8,
};

describe('ListCareRecipientsUseCase', () => {
  it('assembles summary, tabs, triggers and enriches a row', async () => {
    const useCase = make({ rows: [row({})], total: 342 });
    const result = await useCase.execute(baseQuery);

    expect(result.summary).toEqual({
      total: 342,
      active: 298,
      onHold: 31,
      discharged: 13,
      newThisMonth: 8,
      activePercent: 87,
    });
    expect(result.tabs).toEqual({
      all: 342,
      active: 298,
      onHold: 31,
      highPriority: 24,
      newlyAdded: 12,
    });
    expect(result.actionTriggers).toEqual({
      needsAttention: 24,
      missingCarePlan: 3,
      overdueVisit: 5,
    });
    expect(result.totalPages).toBe(Math.ceil(342 / 8));

    const item = result.items[0];
    expect(item.code).toBe('CR-001');
    expect(item.age).toBe(79);
    expect(item.primaryCondition).toBe("Alzheimer's Disease");
    expect(item.careLevel).toBe('24-Hour');
    expect(item.assignedCaregiverName).toBe('Sarah Williams');
    expect(item.status).toBe('ACTIVE');
    expect(item.lastVisitAt).toEqual(new Date('2026-09-15T09:30:00.000Z'));
  });

  it('labels a recently added active recipient as NEW, and shows no caregiver / no last visit', async () => {
    const useCase = make({
      rows: [
        row({
          id: 'r8',
          recipientNumber: 8,
          name: 'Richard Lee',
          status: CareRecipientStatus.Active,
          createdAt: new Date('2026-09-14T00:00:00.000Z'),
          careFrequency: CareFrequency.OneTimeVisit,
          primaryCaregiverId: null,
        }),
      ],
      total: 1,
    });
    const result = await useCase.execute(baseQuery);
    const item = result.items[0];
    expect(item.status).toBe('NEW');
    expect(item.careLevel).toBe('Hourly');
    expect(item.assignedCaregiverName).toBeNull();
    expect(item.lastVisitAt).toBeNull();
  });
});
