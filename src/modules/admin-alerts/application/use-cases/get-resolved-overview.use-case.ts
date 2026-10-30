import { Inject, Injectable } from '@nestjs/common';
import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { INCIDENT_CATEGORY_LABELS } from '../../domain/incident-category.enum';
import { Incident } from '../../domain/incident.entity';
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
import { ResolvedOverviewResult, ResolvedRowResult } from '../dto/resolved-overview.result';
import { alertTypeLabel } from '../alert-presenter';
import { ageLabel, averageResolutionLabel, compactDuration } from '../resolved-presenter';

/** How far back the Resolved tab looks. */
const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 86_400_000;
const RESOLVED_LIMIT = 200;
const SYSTEM_AUTO = 'System Auto';

interface ResolvedItem {
  id: string;
  kind: 'ALERT' | 'INCIDENT' | 'EMERGENCY';
  type: string;
  description: string;
  recipientId: string | null;
  recipientNameSnapshot: string | null;
  resolvedByAdminId: string | null;
  createdAt: Date;
  resolvedAt: Date;
}

/**
 * The Resolved tab: resolved operational alerts, incidents and SOS emergencies in
 * one list with who resolved them, when, and how long they took, plus the average
 * resolution time. Read only.
 */
@Injectable()
export class GetResolvedOverviewUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(ALERTS_ENRICHMENT_READ_MODEL) private readonly reads: AlertsEnrichmentReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<ResolvedOverviewResult> {
    const now = this.clock.now();
    const since = new Date(now.getTime() - WINDOW_MS);

    const [alertRows, incidentRows, sosRows] = await Promise.all([
      this.alerts.listResolvedSince(since, RESOLVED_LIMIT),
      this.incidents.listResolvedSince(since, RESOLVED_LIMIT),
      this.sos.listResolvedSince(since, RESOLVED_LIMIT),
    ]);

    const items: ResolvedItem[] = [
      ...alertRows.filter(hasResolvedAt).map(fromAlert),
      ...incidentRows.filter(hasResolvedAt).map(fromIncident),
      ...sosRows.filter(sosHasResolvedAt).map(fromSos),
    ];

    const recipientIds = [
      ...new Set(items.map((i) => i.recipientId).filter((id): id is string => id !== null)),
    ];
    const adminIds = [
      ...new Set(items.map((i) => i.resolvedByAdminId).filter((id): id is string => id !== null)),
    ];
    const [enrichment, adminNames] = await Promise.all([
      this.reads.enrich(recipientIds, [], []),
      this.reads.adminNames(adminIds),
    ]);

    const sorted = items.sort((a, b) => b.resolvedAt.getTime() - a.resolvedAt.getTime());
    const rows: ResolvedRowResult[] = sorted.map((item) => ({
      id: item.id,
      kind: item.kind,
      type: item.type,
      description: item.description,
      source:
        item.recipientNameSnapshot ??
        (item.recipientId === null ? null : enrichment.recipientNames.get(item.recipientId)) ??
        'Unknown',
      resolvedBy:
        item.resolvedByAdminId === null
          ? SYSTEM_AUTO
          : (adminNames.get(item.resolvedByAdminId) ?? SYSTEM_AUTO),
      resolvedDateLabel: ageLabel(now.getTime() - item.resolvedAt.getTime()),
      resolvedAt: item.resolvedAt.toISOString(),
      resolutionTimeLabel: compactDuration(item.resolvedAt.getTime() - item.createdAt.getTime()),
    }));

    const durations = sorted.map((i) => i.resolvedAt.getTime() - i.createdAt.getTime());

    return {
      generatedAt: now.toISOString(),
      avgResolutionLabel: averageResolutionLabel(durations),
      items: rows,
    };
  }
}

function hasResolvedAt(entry: { resolvedAt: Date | null }): boolean {
  return entry.resolvedAt !== null;
}

function sosHasResolvedAt(entry: SosAlert): boolean {
  return entry.resolvedAt !== null;
}

function fromAlert(alert: OperationalAlert): ResolvedItem {
  return {
    id: alert.id,
    kind: 'ALERT',
    type: alertTypeLabel(alert.type),
    description: alert.description,
    recipientId: alert.relatedCareRecipientId,
    recipientNameSnapshot: null,
    resolvedByAdminId: alert.resolvedByAdminId,
    createdAt: alert.createdAt,
    // Guarded by hasResolvedAt above.
    resolvedAt: alert.resolvedAt as Date,
  };
}

function fromIncident(incident: Incident): ResolvedItem {
  return {
    id: incident.id,
    kind: 'INCIDENT',
    type: INCIDENT_CATEGORY_LABELS[incident.category],
    description: INCIDENT_CATEGORY_LABELS[incident.category],
    recipientId: incident.relatedCareRecipientId,
    recipientNameSnapshot: null,
    resolvedByAdminId: incident.resolvedByAdminId,
    createdAt: incident.createdAt,
    resolvedAt: incident.resolvedAt as Date,
  };
}

function fromSos(entry: SosAlert): ResolvedItem {
  return {
    id: entry.id,
    kind: 'EMERGENCY',
    type: 'Caregiver SOS Alert',
    description: 'Caregiver SOS alert triggered during a visit',
    recipientId: entry.recipient.careRecipientId,
    recipientNameSnapshot: entry.recipient.name,
    resolvedByAdminId: entry.resolvedByAdminId,
    createdAt: entry.createdAt,
    resolvedAt: entry.resolvedAt as Date,
  };
}
