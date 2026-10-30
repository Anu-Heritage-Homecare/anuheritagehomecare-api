import { Inject, Injectable } from '@nestjs/common';
import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import { SosAlertStatus } from '@modules/visits/domain/sos-alert-status.enum';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { AlertSeverity, ALERT_SEVERITY_RANK } from '../../domain/alert-severity.enum';
import { AlertStatus, isActiveStatus } from '../../domain/alert-status.enum';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import { OperationalAlert } from '../../domain/operational-alert.entity';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '../../domain/operational-alert.repository';
import {
  ALERTS_ENRICHMENT_READ_MODEL,
  AlertsEnrichmentReadModel,
} from '../ports/alerts-enrichment-read.port';
import { AlertRowResult, AlertsOverviewResult } from '../dto/alerts-overview.result';
import { alertTypeLabel } from '../alert-presenter';

// The Incidents tab has its own columns (incident id, reporter) and is served by
// ListIncidentsUseCase; this overview feeds the alert and emergency rows and the
// counts for every tab (incidents counted, not listed here).
export type AlertsTab = 'ALL' | 'ACTIVE_ALERTS' | 'EMERGENCIES' | 'RESOLVED';

interface GetAlertsOverviewCommand {
  tab: AlertsTab;
  branch: string | null;
  serviceType: string | null;
}

const OVERVIEW_LIMIT = 200;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** One unified row across operational alerts and SOS emergencies, before display. */
interface UnifiedItem {
  id: string;
  kind: 'ALERT' | 'EMERGENCY';
  type: string;
  description: string;
  source: string;
  at: Date;
  severity: AlertSeverity;
  status: AlertStatus;
  active: boolean;
  branch: string | null;
  serviceType: string | null;
}

/**
 * The Alerts and Incidents screen: the KPI cards, the tab counts and the unified
 * feed of operational alerts (classified as alerts or incidents) plus active SOS
 * emergencies, for one branch and service type filter. Read only.
 */
@Injectable()
export class GetAlertsOverviewUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(ALERTS_ENRICHMENT_READ_MODEL) private readonly reads: AlertsEnrichmentReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetAlertsOverviewCommand): Promise<AlertsOverviewResult> {
    const now = this.clock.now();
    const startOfToday = startOfUtcDay(now);

    const [alertRows, sosRows, incidentRows] = await Promise.all([
      this.alerts.listForOverview(startOfToday, OVERVIEW_LIMIT),
      this.sos.listActive(),
      this.incidents.listForOverview(startOfToday, OVERVIEW_LIMIT),
    ]);

    const recipientIds = [
      ...new Set([
        ...alertRows.map((a) => a.relatedCareRecipientId).filter((id): id is string => id !== null),
        ...sosRows.map((s) => s.recipient.careRecipientId),
      ]),
    ];
    const caregiverIds = [
      ...new Set([
        ...alertRows.map((a) => a.relatedCaregiverId).filter((id): id is string => id !== null),
        ...sosRows.map((s) => s.caregiverId),
      ]),
    ];
    const visitIds = [
      ...new Set([
        ...alertRows.map((a) => a.relatedVisitId).filter((id): id is string => id !== null),
        ...sosRows.map((s) => s.visitId),
      ]),
    ];
    const enrichment = await this.reads.enrich(recipientIds, caregiverIds, visitIds);

    const items = [
      ...alertRows.map((alert) => this.fromAlert(alert, enrichment)),
      ...sosRows.map((entry) => this.fromSos(entry, enrichment)),
    ].filter(
      (item) =>
        (command.branch === null || command.branch === 'ALL' || item.branch === command.branch) &&
        (command.serviceType === null || item.serviceType === command.serviceType),
    );

    const active = items.filter((i) => i.active);
    const resolved = items.filter((i) => !i.active);
    const activeIncidents = incidentRows.filter((i) => i.active);
    // listForOverview bounds resolved/closed incidents to today, so the remainder is today's.
    const resolvedIncidentsToday = incidentRows.length - activeIncidents.length;
    const resolvedCount = resolved.length + resolvedIncidentsToday;

    const counts = {
      all: active.length + activeIncidents.length + resolvedCount,
      activeAlerts: active.filter((i) => i.kind === 'ALERT').length,
      incidents: activeIncidents.length,
      emergencies: active.filter((i) => i.kind === 'EMERGENCY').length,
      resolved: resolvedCount,
    };

    const activeSeverities = [
      ...active.map((i) => i.severity),
      ...activeIncidents.map((i) => i.severity),
    ];

    const visible = this.selectTab(items, active, resolved, command.tab)
      .sort(
        (a, b) =>
          ALERT_SEVERITY_RANK[b.severity] - ALERT_SEVERITY_RANK[a.severity] ||
          b.at.getTime() - a.at.getTime(),
      )
      .map((item): AlertRowResult => ({
        id: item.id,
        kind: item.kind,
        type: item.type,
        description: item.description,
        source: item.source,
        timeLabel: ageLabel(item.at, now),
        at: item.at.toISOString(),
        priority: String(item.severity),
        status: statusLabel(item.status),
      }));

    return {
      generatedAt: now.toISOString(),
      kpis: {
        activeAlerts: counts.activeAlerts,
        highPriority: activeSeverities.filter((s) => s === AlertSeverity.High).length,
        critical: activeSeverities.filter((s) => s === AlertSeverity.Critical).length,
        openIncidents: counts.incidents,
        resolvedToday: resolvedCount,
      },
      counts,
      items: visible,
    };
  }

  private selectTab(
    all: UnifiedItem[],
    active: UnifiedItem[],
    resolved: UnifiedItem[],
    tab: AlertsTab,
  ): UnifiedItem[] {
    switch (tab) {
      case 'ACTIVE_ALERTS':
        return active.filter((i) => i.kind === 'ALERT');
      case 'EMERGENCIES':
        return active.filter((i) => i.kind === 'EMERGENCY');
      case 'RESOLVED':
        return resolved;
      default:
        return all;
    }
  }

  private fromAlert(
    alert: OperationalAlert,
    enrichment: Awaited<ReturnType<AlertsEnrichmentReadModel['enrich']>>,
  ): UnifiedItem {
    const recipientId = alert.relatedCareRecipientId;
    const caregiverId = alert.relatedCaregiverId;
    const visitId = alert.relatedVisitId;
    return {
      id: alert.id,
      kind: 'ALERT',
      type: alertTypeLabel(alert.type),
      description: alert.description,
      source:
        (recipientId === null ? null : enrichment.recipientNames.get(recipientId)) ?? 'Unknown',
      at: alert.createdAt,
      severity: alert.severity,
      status: alert.status,
      active: isActiveStatus(alert.status),
      branch: caregiverId === null ? null : (enrichment.caregiverBranches.get(caregiverId) ?? null),
      serviceType: visitId === null ? null : (enrichment.visitServiceTypes.get(visitId) ?? null),
    };
  }

  private fromSos(
    entry: SosAlert,
    enrichment: Awaited<ReturnType<AlertsEnrichmentReadModel['enrich']>>,
  ): UnifiedItem {
    return {
      id: entry.id,
      kind: 'EMERGENCY',
      type: 'Caregiver SOS Alert',
      description: 'Caregiver SOS alert triggered during a visit',
      source:
        entry.recipient.name ??
        enrichment.recipientNames.get(entry.recipient.careRecipientId) ??
        'Unknown',
      at: entry.createdAt,
      severity: AlertSeverity.Critical,
      // An active SOS stays active; once help is dispatched it is being worked.
      status:
        entry.status === SosAlertStatus.Active && entry.dispatchedAt === null
          ? AlertStatus.Open
          : AlertStatus.Investigating,
      active: entry.status === SosAlertStatus.Active,
      branch: enrichment.caregiverBranches.get(entry.caregiverId) ?? null,
      serviceType: enrichment.visitServiceTypes.get(entry.visitId) ?? null,
    };
  }
}

function statusLabel(status: AlertStatus): string {
  switch (status) {
    case AlertStatus.Open:
      return 'New';
    case AlertStatus.Acknowledged:
      return 'Acknowledged';
    case AlertStatus.Investigating:
      return 'Investigating';
    case AlertStatus.Resolved:
      return 'Resolved';
    default:
      return 'Dismissed';
  }
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function ageLabel(from: Date, now: Date): string {
  const diff = now.getTime() - from.getTime();
  if (diff < HOUR_MS) {
    return `${Math.max(1, Math.floor(diff / MINUTE_MS))}m ago`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}h ago`;
  }
  return `${Math.floor(diff / DAY_MS)}d ago`;
}
