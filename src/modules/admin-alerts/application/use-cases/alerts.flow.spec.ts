import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertStatus } from '../../domain/alert-status.enum';
import { AlertType } from '../../domain/alert-type.enum';
import { OperationalAlert } from '../../domain/operational-alert.entity';
import { OperationalAlertRepository } from '../../domain/operational-alert.repository';
import { ListOpenAlertsUseCase } from './list-open-alerts.use-case';
import { RaiseAlertUseCase } from './raise-alert.use-case';
import { ResolveAlertUseCase } from './resolve-alert.use-case';

const NOW = new Date('2026-09-06T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `alert-${n}`;
    },
  };
}

class InMemoryAlertRepository implements OperationalAlertRepository {
  public readonly store = new Map<string, OperationalAlert>();

  save(alert: OperationalAlert): Promise<void> {
    this.store.set(alert.id, alert);
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

describe('operational alerts', () => {
  it('lists open alerts most severe first, then most recent', async () => {
    const repo = new InMemoryAlertRepository();
    const raise = new RaiseAlertUseCase(repo, clock, sequentialIds());
    await raise.execute({
      type: AlertType.CertificationExpiring,
      severity: AlertSeverity.Medium,
      title: 'CPR cert expiring',
      description: 'Maria Garcia CPR cert expires in 3 days',
    });
    await raise.execute({
      type: AlertType.MissedClockIn,
      severity: AlertSeverity.Critical,
      title: 'Missed clock in',
      description: "David Park hasn't clocked in for the 9:30 visit",
    });

    const list = await new ListOpenAlertsUseCase(repo).execute();
    expect(list.map((a) => a.severity)).toEqual([AlertSeverity.Critical, AlertSeverity.Medium]);
  });

  it('resolves an alert and drops it from the open list', async () => {
    const repo = new InMemoryAlertRepository();
    const raise = new RaiseAlertUseCase(repo, clock, sequentialIds());
    const raised = await raise.execute({
      type: AlertType.LateCaregiver,
      severity: AlertSeverity.High,
      title: 'Late caregiver',
      description: 'Sarah Williams 15 min late',
    });

    const closed = await new ResolveAlertUseCase(repo, clock).execute({
      alertId: raised.id,
      adminId: 'admin-1',
      closure: 'RESOLVE',
    });

    expect(closed.status).toBe(AlertStatus.Resolved);
    expect(await repo.countOpen()).toBe(0);
  });

  it('rejects closing an unknown alert', async () => {
    const repo = new InMemoryAlertRepository();
    await expect(
      new ResolveAlertUseCase(repo, clock).execute({
        alertId: 'nope',
        adminId: 'admin-1',
        closure: 'DISMISS',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects closing an alert that is already closed', () => {
    const alert = OperationalAlert.raise({
      id: 'a1',
      type: AlertType.General,
      severity: AlertSeverity.Low,
      title: 'x',
      description: 'y',
      now: NOW,
    });
    alert.resolve('admin-1', NOW);
    expect(() => alert.dismiss('admin-1', NOW)).toThrow(ValidationException);
  });
});
