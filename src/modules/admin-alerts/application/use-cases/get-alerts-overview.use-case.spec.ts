import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import { SosAlertStatus } from '@modules/visits/domain/sos-alert-status.enum';
import { SosAlertRepository } from '@modules/visits/domain/sos-alert.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertType } from '../../domain/alert-type.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { OperationalAlert } from '../../domain/operational-alert.entity';
import { OperationalAlertRepository } from '../../domain/operational-alert.repository';
import { AlertsEnrichmentReadModel } from '../ports/alerts-enrichment-read.port';
import { GetAlertsOverviewUseCase } from './get-alerts-overview.use-case';
import { ProgressAlertUseCase } from './progress-alert.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function alert(type: AlertType, severity: AlertSeverity): OperationalAlert {
  return OperationalAlert.raise({
    id: `alert-${type}`,
    type,
    severity,
    title: type,
    description: `${type} description`,
    relatedCareRecipientId: 'r1',
    now: NOW,
  });
}

function incident(category: IncidentCategory, severity: AlertSeverity): Incident {
  return Incident.report({ id: `incident-${category}`, category, severity, now: NOW });
}

function sos(): SosAlert {
  return {
    id: 'sos-1',
    caregiverId: 'cg-1',
    visitId: 'v-1',
    recipient: {
      careRecipientId: 'r1',
      name: 'Mrs. Funmilayo Adebayo',
      address: null,
      location: null,
    },
    status: SosAlertStatus.Active,
    dispatchedAt: null,
    createdAt: new Date('2026-07-24T11:50:00.000Z'),
  } as unknown as SosAlert;
}

function alertsRepo(alerts: OperationalAlert[]): OperationalAlertRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(alerts.find((a) => a.id === id) ?? null),
    listOpen: () => Promise.resolve(alerts),
    listForOverview: () => Promise.resolve(alerts),
    listResolvedSince: () => Promise.resolve([]),
    countOpen: () => Promise.resolve(0),
    existsOpenForVisit: () => Promise.resolve(false),
    existsOpenForCaregiver: () => Promise.resolve(false),
  };
}

function incidentsRepo(incidents: Incident[]): IncidentRepository {
  return {
    create: (i) => Promise.resolve(i),
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(incidents.find((i) => i.id === id) ?? null),
    listForOverview: () => Promise.resolve(incidents),
    listResolvedSince: () => Promise.resolve([]),
  };
}

const sosRepo: SosAlertRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  listActive: () => Promise.resolve([sos()]),
  listResolvedSince: () => Promise.resolve([]),
};

const enrichment: AlertsEnrichmentReadModel = {
  enrich: () =>
    Promise.resolve({
      recipientNames: new Map([['r1', 'Mrs. Chioma Obi']]),
      caregiverBranches: new Map(),
      visitServiceTypes: new Map(),
    }),
  adminNames: () => Promise.resolve(new Map()),
};

describe('GetAlertsOverviewUseCase', () => {
  it('computes the KPIs, the tab counts and the alert/emergency feed', async () => {
    const active = alert(AlertType.MissedClockIn, AlertSeverity.High); // active ALERT
    const resolved = alert(AlertType.VisitOverdue, AlertSeverity.Low);
    resolved.resolve('admin-1', NOW); // resolved today
    const openIncident = incident(IncidentCategory.RecipientFall, AlertSeverity.High);

    const result = await new GetAlertsOverviewUseCase(
      alertsRepo([active, resolved]),
      sosRepo,
      incidentsRepo([openIncident]),
      enrichment,
      clock,
    ).execute({ tab: 'ALL', branch: null, serviceType: null });

    expect(result.counts).toEqual({
      all: 4, // 1 active alert + 1 open incident + 1 SOS + 1 resolved alert
      activeAlerts: 1,
      incidents: 1,
      emergencies: 1,
      resolved: 1,
    });
    expect(result.kpis.activeAlerts).toBe(1);
    expect(result.kpis.critical).toBe(1); // the SOS
    expect(result.kpis.highPriority).toBe(2); // missed check-in alert + fall incident
    expect(result.kpis.openIncidents).toBe(1);
    expect(result.kpis.resolvedToday).toBe(1);

    // The SOS sorts first (critical), with its snapshot source and display type.
    expect(result.items[0]).toMatchObject({
      kind: 'EMERGENCY',
      type: 'Caregiver SOS Alert',
      source: 'Mrs. Funmilayo Adebayo',
      status: 'New',
    });
    // Incidents are not part of the alert/emergency feed (own tab and endpoint).
    expect(result.items.every((i) => i.kind !== 'INCIDENT')).toBe(true);
  });

  it('acknowledges then investigates an alert through its lifecycle', async () => {
    const target = alert(AlertType.MissedClockIn, AlertSeverity.High);
    const repo = alertsRepo([target]);
    const progress = new ProgressAlertUseCase(repo);

    const acknowledged = await progress.execute({ alertId: target.id, progress: 'ACKNOWLEDGE' });
    expect(acknowledged.status).toBe('ACKNOWLEDGED');
    const investigating = await progress.execute({ alertId: target.id, progress: 'INVESTIGATE' });
    expect(investigating.status).toBe('INVESTIGATING');
  });
});
