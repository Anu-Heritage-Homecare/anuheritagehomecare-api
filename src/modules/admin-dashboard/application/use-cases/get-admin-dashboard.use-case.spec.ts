import { RaiseAlertUseCase } from '@modules/admin-alerts/application/use-cases/raise-alert.use-case';
import { AlertStatus } from '@modules/admin-alerts/domain/alert-status.enum';
import { OperationalAlert } from '@modules/admin-alerts/domain/operational-alert.entity';
import { OperationalAlertRepository } from '@modules/admin-alerts/domain/operational-alert.repository';
import { OperationalTaskRepository } from '@modules/admin-tasks/domain/operational-task.repository';
import {
  CareRatingRepository,
  RatingSummary,
} from '@modules/care-ratings/domain/care-rating.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { Certification } from '@modules/certifications/domain/certification.entity';
import { CertificationRepository } from '@modules/certifications/domain/certification.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { InMemoryVisitRepository, buildVisit } from '@modules/visits/test-support/doubles';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { GetAdminDashboardUseCase } from './get-admin-dashboard.use-case';

// Matches the visits test-support FIXED_NOW (2026-07-12T12:00:00Z): noon, minute 720.
const NOW = new Date('2026-07-12T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `alert-${(n += 1)}` };
}

class InMemoryAlertRepo implements OperationalAlertRepository {
  store = new Map<string, OperationalAlert>();
  save(a: OperationalAlert): Promise<void> {
    this.store.set(a.id, a);
    return Promise.resolve();
  }
  findById(id: string): Promise<OperationalAlert | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  listOpen(limit: number): Promise<OperationalAlert[]> {
    return Promise.resolve(
      [...this.store.values()].filter((a) => a.status === AlertStatus.Open).slice(0, limit),
    );
  }
  countOpen(): Promise<number> {
    return Promise.resolve(
      [...this.store.values()].filter((a) => a.status === AlertStatus.Open).length,
    );
  }
  existsOpenForVisit(type: string, visitId: string): Promise<boolean> {
    return Promise.resolve(
      [...this.store.values()].some(
        (a) =>
          a.status === AlertStatus.Open && String(a.type) === type && a.relatedVisitId === visitId,
      ),
    );
  }
  existsOpenForCaregiver(type: string, caregiverId: string): Promise<boolean> {
    return Promise.resolve(
      [...this.store.values()].some(
        (a) =>
          a.status === AlertStatus.Open &&
          String(a.type) === type &&
          a.relatedCaregiverId === caregiverId,
      ),
    );
  }
}

const taskRepo: OperationalTaskRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  list: () => Promise.resolve([]),
  countOpen: () => Promise.resolve(3),
};

const ratingRepo: CareRatingRepository = {
  save: () => Promise.resolve(),
  summarise: (): Promise<RatingSummary> => Promise.resolve({ average: 4.5, count: 10 }),
};

const certRepo: CertificationRepository = {
  save: () => Promise.resolve(),
  listExpiringBefore: () => Promise.resolve<Certification[]>([]),
};

function recipient(id: string, name: string): CareRecipient {
  return { id, profile: { name } } as unknown as CareRecipient;
}

const recipientRepo: CareRecipientRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  findByIds: (ids2: string[]) =>
    Promise.resolve(ids2.map((id) => recipient(id, `Recipient ${id}`))),
  listByOwner: () => Promise.resolve([]),
};

function caregiver(id: string): User {
  return {
    id,
    userType: UserType.Caregiver,
    name: { fullName: `Caregiver ${id}` },
  } as unknown as User;
}

const userRepo: UserRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  findByIds: (ids2: string[]) => Promise.resolve(ids2.map((id) => caregiver(id))),
  findByEmail: () => Promise.resolve(null),
  existsByEmail: () => Promise.resolve(false),
  existsByPhone: () => Promise.resolve(false),
  countByType: () => Promise.resolve(5),
};

describe('GetAdminDashboardUseCase', () => {
  function make(): {
    useCase: GetAdminDashboardUseCase;
    alerts: InMemoryAlertRepo;
    visits: InMemoryVisitRepository;
  } {
    const visits = new InMemoryVisitRepository();
    const alerts = new InMemoryAlertRepo();
    const raiseAlert = new RaiseAlertUseCase(alerts, clock, ids());
    const useCase = new GetAdminDashboardUseCase(
      visits,
      recipientRepo,
      userRepo,
      alerts,
      taskRepo,
      ratingRepo,
      certRepo,
      clock,
      raiseAlert,
    );
    return { useCase, alerts, visits };
  }

  it('aggregates the operations snapshot, schedule and performance', async () => {
    const { useCase, visits } = make();
    await visits.save(
      buildVisit({
        id: 'v-a',
        caregiverId: 'cg-1',
        careRecipientId: 'r-1',
        status: VisitStatus.Completed,
        startMinute: 480,
        clockInAt: new Date('2026-07-12T08:00:00.000Z'),
        clockOutAt: new Date('2026-07-12T09:00:00.000Z'),
      }),
    );
    await visits.save(
      buildVisit({
        id: 'v-b',
        caregiverId: 'cg-2',
        careRecipientId: 'r-2',
        status: VisitStatus.InProgress,
        startMinute: 690,
        endMinute: 750,
        clockInAt: new Date('2026-07-12T11:30:00.000Z'),
      }),
    );
    await visits.save(
      buildVisit({
        id: 'v-e',
        caregiverId: 'cg-4',
        careRecipientId: 'r-1',
        status: VisitStatus.Scheduled,
        startMinute: 760,
        endMinute: 820,
      }),
    );

    const result = await useCase.execute();

    expect(result.operations.scheduledToday).toBe(3);
    expect(result.operations.activeHomeVisits).toBe(1);
    expect(result.operations.scheduledCompletionPercent).toBe(33);
    // 5 caregivers total, one (cg-2) on an active visit -> 4 available.
    expect(result.operations.availableCaregivers).toBe(4);
    // v-e is scheduled to start at 12:40, within the next hour of noon.
    expect(result.operations.visitsStartingSoon).toBe(1);
    expect(result.todaysSchedule).toHaveLength(3);
    expect(result.performance.openTasks).toBe(3);
    expect(result.performance.clientSatisfaction).toBe(4.5);
    expect(result.performance.revenueTodayMinor).toBeNull();
    expect(result.operations.careQualityScore).not.toBeNull();
  });

  it('raises a missed clock in alert for an assigned, overdue, un-started visit (idempotently)', async () => {
    const { useCase, alerts, visits } = make();
    await visits.save(
      buildVisit({
        id: 'v-late',
        caregiverId: 'cg-9',
        careRecipientId: 'r-9',
        status: VisitStatus.Scheduled,
        startMinute: 540, // 9:00, three hours before noon -> missed
      }),
    );

    await useCase.execute();
    expect(await alerts.countOpen()).toBe(1);

    // A second load does not raise a duplicate for the same visit.
    await useCase.execute();
    expect(await alerts.countOpen()).toBe(1);
    expect(result(alerts)[0].relatedVisitId).toBe('v-late');
  });
});

function result(alerts: InMemoryAlertRepo): OperationalAlert[] {
  return [...alerts.store.values()];
}
