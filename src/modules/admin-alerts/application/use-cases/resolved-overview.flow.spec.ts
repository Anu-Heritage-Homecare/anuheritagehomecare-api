import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import { SosAlertRepository } from '@modules/visits/domain/sos-alert.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertType } from '../../domain/alert-type.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { OperationalAlert } from '../../domain/operational-alert.entity';
import { OperationalAlertRepository } from '../../domain/operational-alert.repository';
import { AlertsEnrichmentReadModel } from '../ports/alerts-enrichment-read.port';
import { GetResolvedOverviewUseCase } from './get-resolved-overview.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function resolvedAlert(): OperationalAlert {
  const alert = OperationalAlert.raise({
    id: 'alert-1',
    type: AlertType.MissedClockIn,
    severity: AlertSeverity.High,
    title: 'Missed',
    description: 'Caregiver missed scheduled check-in',
    relatedCareRecipientId: 'r1',
    now: new Date('2026-07-24T11:00:00.000Z'), // 1h before resolution
  });
  alert.resolve('admin-1', new Date('2026-07-24T11:30:00.000Z')); // 30m resolution, 30m ago
  return alert;
}

function autoResolvedAlert(): OperationalAlert {
  const alert = OperationalAlert.raise({
    id: 'alert-2',
    type: AlertType.LateCaregiver,
    severity: AlertSeverity.Medium,
    title: 'Late',
    description: 'Caregiver late',
    relatedCareRecipientId: 'r1',
    now: new Date('2026-07-24T10:00:00.000Z'),
  });
  // Auto-resolution leaves no admin id (System Auto).
  alert.resolve('', new Date('2026-07-24T11:00:00.000Z'));
  (alert as unknown as { props: { resolvedByAdminId: string | null } }).props.resolvedByAdminId =
    null;
  return alert;
}

function resolvedSos(): SosAlert {
  const sos = SosAlert.raise({
    id: 'sos-1',
    caregiverId: 'cg-1',
    visitId: 'v-1',
    position: null,
    recipient: { careRecipientId: 'r1', name: 'Amina Bello', address: null, location: null },
    now: new Date('2026-07-24T10:30:00.000Z'), // 1h30 before resolution
  });
  sos.resolve('admin-1', new Date('2026-07-24T11:00:00.000Z'));
  return sos;
}

function alertsRepo(alerts: OperationalAlert[]): OperationalAlertRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listOpen: () => Promise.resolve([]),
    listForOverview: () => Promise.resolve([]),
    listResolvedSince: () => Promise.resolve(alerts),
    countOpen: () => Promise.resolve(0),
    existsOpenForVisit: () => Promise.resolve(false),
    existsOpenForCaregiver: () => Promise.resolve(false),
  };
}

function incidentsRepo(incidents: Incident[]): IncidentRepository {
  return {
    create: (i) => Promise.resolve(i),
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listForOverview: () => Promise.resolve([]),
    listResolvedSince: () => Promise.resolve(incidents),
  };
}

function sosRepo(sos: SosAlert[]): SosAlertRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listActive: () => Promise.resolve([]),
    listResolvedSince: () => Promise.resolve(sos),
  };
}

const enrichment: AlertsEnrichmentReadModel = {
  enrich: () =>
    Promise.resolve({
      recipientNames: new Map([['r1', 'Joy Idowu']]),
      caregiverBranches: new Map(),
      visitServiceTypes: new Map(),
    }),
  adminNames: () => Promise.resolve(new Map([['admin-1', 'Sarah Jenkins']])),
};

describe('GetResolvedOverviewUseCase', () => {
  it('unifies resolved alerts, incidents and emergencies with resolution columns', async () => {
    const result = await new GetResolvedOverviewUseCase(
      alertsRepo([resolvedAlert(), autoResolvedAlert()]),
      incidentsRepo([
        (() => {
          const i = Incident.rehydrate('i1', {
            sequence: 1,
            category: IncidentCategory.MedicationConcern,
            severity: AlertSeverity.High,
            status: IncidentStatus.Resolved,
            detail: null,
            reporterName: null,
            reportedByAdminId: null,
            assignedCoordinatorAdminId: null,
            relatedVisitId: null,
            relatedCaregiverId: null,
            relatedCareRecipientId: 'r1',
            createdAt: new Date('2026-07-24T09:00:00.000Z'),
            resolvedAt: new Date('2026-07-24T11:00:00.000Z'),
            resolvedByAdminId: 'admin-1',
          });
          return i;
        })(),
      ]),
      sosRepo([resolvedSos()]),
      enrichment,
      clock,
    ).execute();

    // 2 alerts + 1 incident + 1 emergency, most recently resolved first.
    expect(result.items).toHaveLength(4);
    const sosRow = result.items.find((r) => r.kind === 'EMERGENCY');
    expect(sosRow).toMatchObject({
      type: 'Caregiver SOS Alert',
      source: 'Amina Bello',
      resolvedBy: 'Sarah Jenkins',
      resolutionTimeLabel: '30m',
    });
    const autoRow = result.items.find((r) => r.id === 'alert-2');
    expect(autoRow?.resolvedBy).toBe('System Auto');
    // Average across [30m, 60m, 120m, 30m] = 60m → "1 hr".
    expect(result.avgResolutionLabel).toBe('1 hr');
  });

  it('returns a null average when nothing is resolved', async () => {
    const result = await new GetResolvedOverviewUseCase(
      alertsRepo([]),
      incidentsRepo([]),
      sosRepo([]),
      enrichment,
      clock,
    ).execute();
    expect(result.items).toHaveLength(0);
    expect(result.avgResolutionLabel).toBeNull();
  });
});
