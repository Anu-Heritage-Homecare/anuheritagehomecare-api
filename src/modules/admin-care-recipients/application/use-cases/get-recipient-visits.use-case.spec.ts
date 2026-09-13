import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  RecipientVisitRowView,
  RecipientVisitsFilter,
  RecipientVisitsPageView,
  RecipientVisitsReadModel,
  RecipientVisitsStatsView,
} from '../ports/recipient-visits-read.port';
import { GetRecipientVisitsUseCase } from './get-recipient-visits.use-case';

const NOW = new Date('2026-09-13T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function users(map: Record<string, string>): UserRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    findByIds: (ids) =>
      Promise.resolve(
        ids
          .filter((id) => id in map)
          .map((id) => ({ id, name: { fullName: map[id] } }) as unknown as User),
      ),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function row(overrides: Partial<RecipientVisitRowView>): RecipientVisitRowView {
  return {
    id: 'v1',
    caregiverId: 'cg1',
    scheduledDate: new Date('2026-09-10T00:00:00.000Z'),
    startMinute: 540,
    endMinute: 690,
    visitType: VisitType.MorningCare,
    status: VisitStatus.Completed,
    clockInAt: null,
    clockOutAt: null,
    ...overrides,
  };
}

class FakeReadModel implements RecipientVisitsReadModel {
  public lastFilter: RecipientVisitsFilter | null = null;
  constructor(
    private readonly page: RecipientVisitsPageView,
    private readonly statsView: RecipientVisitsStatsView,
  ) {}
  listPage(filter: RecipientVisitsFilter): Promise<RecipientVisitsPageView> {
    this.lastFilter = filter;
    return Promise.resolve(this.page);
  }
  stats(): Promise<RecipientVisitsStatsView> {
    return Promise.resolve(this.statsView);
  }
}

function stats(overrides: Partial<RecipientVisitsStatsView>): RecipientVisitsStatsView {
  return {
    totalVisits: 156,
    completedVisits: 153,
    thisMonthVisits: 28,
    avgDurationMinutes: 150,
    typeCounts: [
      { visitType: VisitType.MorningCare, count: 70 },
      { visitType: VisitType.PhysicalTherapy, count: 40 },
    ],
    caregiverCounts: [
      { caregiverId: 'cg1', count: 112 },
      { caregiverId: 'cg2', count: 44 },
    ],
    trendDates: [],
    ...overrides,
  };
}

describe('GetRecipientVisitsUseCase', () => {
  const baseQuery = {
    recipientId: R,
    from: null,
    to: null,
    caregiverId: null,
    visitType: null,
    status: null,
    search: null,
    page: 1,
    pageSize: 10,
  };

  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientVisitsUseCase(
      recipients(false),
      new FakeReadModel({ rows: [], total: 0 }, stats({})),
      users({}),
      clock,
    );
    await expect(useCase.execute({ ...baseQuery, recipientId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });

  it('derives the summary card rates from the history aggregates', async () => {
    const useCase = new GetRecipientVisitsUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, stats({})),
      users({ cg1: 'Sarah Williams', cg2: 'David Park' }),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.summary.totalVisits).toBe(156);
    expect(result.summary.thisMonthVisits).toBe(28);
    expect(result.summary.avgDurationHours).toBe(2.5);
    expect(result.summary.completionRatePercent).toBe(98.1);
    expect(result.summary.successfulVisits).toBe(153);
  });

  it('flags a completed visit clocked in after the scheduled start as a late arrival', async () => {
    const late = row({
      id: 'late',
      startMinute: 540,
      clockInAt: new Date('2026-09-10T09:12:00.000Z'),
    });
    const onTime = row({
      id: 'ontime',
      startMinute: 540,
      clockInAt: new Date('2026-09-10T08:56:00.000Z'),
    });
    const cancelled = row({ id: 'cancelled', status: VisitStatus.Cancelled, clockInAt: null });
    const useCase = new GetRecipientVisitsUseCase(
      recipients(true),
      new FakeReadModel({ rows: [late, onTime, cancelled], total: 3 }, stats({})),
      users({ cg1: 'Sarah Williams' }),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    const byId = new Map(result.page.items.map((i) => [i.id, i]));
    expect(byId.get('late')?.lateArrival).toBe(true);
    expect(byId.get('ontime')?.lateArrival).toBe(false);
    expect(byId.get('cancelled')?.lateArrival).toBe(false);
    expect(byId.get('late')?.caregiverName).toBe('Sarah Williams');
    expect(byId.get('late')?.durationMinutes).toBe(150);
  });

  it('reports the most common visit type and primary caregiver coverage', async () => {
    const useCase = new GetRecipientVisitsUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, stats({})),
      users({ cg1: 'Sarah Williams', cg2: 'David Park' }),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.analytics.mostCommonVisitType).toEqual({
      visitType: 'MORNING_CARE',
      percent: round1((70 / 156) * 100),
    });
    expect(result.analytics.primaryCaregiverCoverage).toEqual({
      caregiverId: 'cg1',
      name: 'Sarah Williams',
      visitCount: 112,
      percent: round1((112 / 156) * 100),
    });
    expect(result.caregivers).toEqual([
      { id: 'cg1', name: 'Sarah Williams' },
      { id: 'cg2', name: 'David Park' },
    ]);
  });

  it('buckets the trend dates into trailing weeks and computes the trend', async () => {
    // Two visits last week, none the week before: a positive trend.
    const trendDates = [new Date('2026-09-11T00:00:00.000Z'), new Date('2026-09-12T00:00:00.000Z')];
    const useCase = new GetRecipientVisitsUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, stats({ trendDates })),
      users({ cg1: 'Sarah Williams', cg2: 'David Park' }),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.analytics.weeklyCounts).toHaveLength(8);
    // NOW is 2026-09-13; the two dates fall in the last completed week (bucket 6),
    // with bucket 7 being the current in progress week.
    expect(result.analytics.weeklyCounts[6]).toBe(2);
    expect(result.analytics.weeklyCounts.reduce((s, n) => s + n, 0)).toBe(2);
  });

  it('passes the filter through to the read model and paginates', async () => {
    const readModel = new FakeReadModel({ rows: [], total: 25 }, stats({}));
    const useCase = new GetRecipientVisitsUseCase(recipients(true), readModel, users({}), clock);
    const result = await useCase.execute({
      ...baseQuery,
      status: VisitStatus.Completed,
      visitType: VisitType.MorningCare,
      caregiverId: 'cg1',
      page: 2,
      pageSize: 10,
    });
    expect(readModel.lastFilter?.status).toBe(VisitStatus.Completed);
    expect(readModel.lastFilter?.visitType).toBe(VisitType.MorningCare);
    expect(readModel.lastFilter?.caregiverId).toBe('cg1');
    expect(result.page.total).toBe(25);
    expect(result.page.totalPages).toBe(3);
    expect(result.page.page).toBe(2);
  });
});

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
