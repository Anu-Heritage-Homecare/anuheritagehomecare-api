import { AlertSeverity } from '@modules/admin-alerts/domain/alert-severity.enum';
import { AlertStatus } from '@modules/admin-alerts/domain/alert-status.enum';
import { AlertType } from '@modules/admin-alerts/domain/alert-type.enum';
import { OperationalAlert } from '@modules/admin-alerts/domain/operational-alert.entity';
import { OperationalAlertRepository } from '@modules/admin-alerts/domain/operational-alert.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AcknowledgeAlertUseCase, ResolveAlertUseCase } from './manage-alert.use-case';

const NOW = new Date('2026-07-24T16:45:00.000Z');
const clock: Clock = { now: () => NOW };
const ADMIN_ID = 'admin-1';

function openAlert(): OperationalAlert {
  return OperationalAlert.raise({
    id: 'a-1',
    type: AlertType.MissedClockIn,
    severity: AlertSeverity.High,
    title: 'Missed check-in',
    description: 'Caregiver check-in is overdue',
    relatedVisitId: 'v-1',
    now: new Date('2026-07-24T16:30:00.000Z'),
  });
}

function repoWith(alert: OperationalAlert | null): {
  repo: OperationalAlertRepository;
  saved: OperationalAlert[];
} {
  const saved: OperationalAlert[] = [];
  const repo: OperationalAlertRepository = {
    findById: (id) => Promise.resolve(alert !== null && alert.id === id ? alert : null),
    save: (a) => {
      saved.push(a);
      return Promise.resolve();
    },
    listOpen: () => Promise.resolve([]),
    countOpen: () => Promise.resolve(0),
    existsOpenForVisit: () => Promise.resolve(false),
    existsOpenForCaregiver: () => Promise.resolve(false),
  };
  return { repo, saved };
}

describe('AcknowledgeAlertUseCase', () => {
  it('dismisses an open alert and saves it', async () => {
    const alert = openAlert();
    const { repo, saved } = repoWith(alert);
    await new AcknowledgeAlertUseCase(repo, clock).execute('a-1', ADMIN_ID);
    expect(alert.status).toBe(AlertStatus.Dismissed);
    expect(alert.resolvedByAdminId).toBe(ADMIN_ID);
    expect(saved).toHaveLength(1);
  });

  it('rejects an unknown alert', async () => {
    const { repo } = repoWith(null);
    await expect(
      new AcknowledgeAlertUseCase(repo, clock).execute('missing', ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ResolveAlertUseCase', () => {
  it('resolves an open alert and saves it', async () => {
    const alert = openAlert();
    const { repo, saved } = repoWith(alert);
    await new ResolveAlertUseCase(repo, clock).execute('a-1', ADMIN_ID);
    expect(alert.status).toBe(AlertStatus.Resolved);
    expect(alert.resolvedByAdminId).toBe(ADMIN_ID);
    expect(saved).toHaveLength(1);
  });

  it('rejects an unknown alert', async () => {
    const { repo } = repoWith(null);
    await expect(
      new ResolveAlertUseCase(repo, clock).execute('missing', ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
