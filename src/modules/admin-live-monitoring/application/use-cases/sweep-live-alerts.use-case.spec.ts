import { RaiseAlertUseCase } from '@modules/admin-alerts/application/use-cases/raise-alert.use-case';
import { OperationalAlert } from '@modules/admin-alerts/domain/operational-alert.entity';
import { OperationalAlertRepository } from '@modules/admin-alerts/domain/operational-alert.repository';
import { AlertStatus } from '@modules/admin-alerts/domain/alert-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { LiveSnapshot, LiveVisitRow } from '../ports/live-monitoring-read.port';
import { SweepLiveAlertsUseCase } from './sweep-live-alerts.use-case';

const NOW = new Date('2026-07-24T16:45:00.000Z'); // minute 1005
const clock: Clock = { now: () => NOW };

class InMemoryAlertRepository implements OperationalAlertRepository {
  readonly saved: OperationalAlert[] = [];

  save(alert: OperationalAlert): Promise<void> {
    const index = this.saved.findIndex((a) => a.id === alert.id);
    if (index >= 0) {
      this.saved[index] = alert;
    } else {
      this.saved.push(alert);
    }
    return Promise.resolve();
  }

  findById(id: string): Promise<OperationalAlert | null> {
    return Promise.resolve(this.saved.find((a) => a.id === id) ?? null);
  }

  listOpen(limit: number): Promise<OperationalAlert[]> {
    return Promise.resolve(this.saved.filter((a) => a.status === AlertStatus.Open).slice(0, limit));
  }

  countOpen(): Promise<number> {
    return Promise.resolve(this.saved.filter((a) => a.status === AlertStatus.Open).length);
  }

  existsOpenForVisit(type: string, visitId: string): Promise<boolean> {
    return Promise.resolve(
      this.saved.some(
        (a) =>
          a.status === AlertStatus.Open && String(a.type) === type && a.relatedVisitId === visitId,
      ),
    );
  }

  existsOpenForCaregiver(type: string, caregiverId: string): Promise<boolean> {
    return Promise.resolve(
      this.saved.some(
        (a) =>
          a.status === AlertStatus.Open &&
          String(a.type) === type &&
          a.relatedCaregiverId === caregiverId,
      ),
    );
  }
}

function visit(over: Partial<LiveVisitRow> & { id: string }): LiveVisitRow {
  return {
    status: 'SCHEDULED',
    caregiverId: 'cg',
    careRecipientId: 'r',
    startMinute: 600,
    endMinute: 720,
    visitType: 'PERSONAL_CARE',
    priority: 'NORMAL',
    clockInAt: null,
    clockOutAt: null,
    recipientName: 'Recipient',
    caregiverName: 'Caregiver',
    caregiverBranch: 'West',
    recipientLatitude: null,
    recipientLongitude: null,
    medications: [],
    vitals: [],
    ...over,
  };
}

function snapshot(): LiveSnapshot {
  return {
    visits: [
      visit({ id: 'v-missed', caregiverId: 'cg-missed', startMinute: 970 }), // lateBy 35 -> missed
      visit({ id: 'v-late', caregiverId: 'cg-late', startMinute: 990 }), // lateBy 15 -> late
      visit({
        id: 'v-overdue',
        status: 'IN_PROGRESS',
        caregiverId: 'cg-overdue',
        startMinute: 780,
        endMinute: 960, // overBy 45 -> overdue; and no location -> location failed
        clockInAt: new Date('2026-07-24T13:00:00.000Z'),
      }),
    ],
    sosAlerts: [],
    caregiverLocations: [],
  };
}

function build(): { sweep: SweepLiveAlertsUseCase; repo: InMemoryAlertRepository } {
  const repo = new InMemoryAlertRepository();
  let seq = 0;
  const ids: IdGenerator = { generate: () => `alert-${(seq += 1)}` };
  const raise = new RaiseAlertUseCase(repo, clock, ids);
  return { sweep: new SweepLiveAlertsUseCase(repo, raise), repo };
}

describe('SweepLiveAlertsUseCase', () => {
  it('raises an operational alert for each detected condition', async () => {
    const { sweep, repo } = build();
    await sweep.execute(snapshot(), NOW);

    const byVisit = (id: string): string[] =>
      repo.saved.filter((a) => a.relatedVisitId === id).map((a) => a.type);
    expect(byVisit('v-missed')).toEqual(['MISSED_CLOCK_IN']);
    expect(byVisit('v-late')).toEqual(['LATE_CAREGIVER']);
    expect(byVisit('v-overdue').sort()).toEqual(['LOCATION_VERIFICATION_FAILED', 'VISIT_OVERDUE']);
  });

  it('does not raise a duplicate open alert on a repeated sweep', async () => {
    const { sweep, repo } = build();
    await sweep.execute(snapshot(), NOW);
    const afterFirst = repo.saved.length;
    await sweep.execute(snapshot(), NOW);
    expect(repo.saved.length).toBe(afterFirst);
  });
});
