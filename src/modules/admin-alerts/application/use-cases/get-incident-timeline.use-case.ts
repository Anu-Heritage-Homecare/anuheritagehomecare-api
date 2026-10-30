import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Incident } from '../../domain/incident.entity';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import {
  INCIDENT_TIMELINE_REPOSITORY,
  IncidentTimelineRepository,
} from '../../domain/incident-timeline.repository';
import {
  ALERTS_ENRICHMENT_READ_MODEL,
  AlertsEnrichmentReadModel,
} from '../ports/alerts-enrichment-read.port';
import {
  IncidentTimelineEntryResult,
  IncidentTimelineResult,
} from '../dto/incident-timeline.result';
import { clockLabel } from '../emergency-presenter';
import { dayLabel } from '../incident-detail-presenter';
import { incidentNumber } from '../incident-presenter';

interface RawEntry {
  at: Date;
  title: string;
  description: string;
  actorName: string | null;
  actorRole: string | null;
  kind: string;
}

/**
 * The Incident Detail Timeline tab: the structural events derived from the incident
 * (reported, resolved/closed) merged with the appended timeline events, oldest
 * first. Read only.
 */
@Injectable()
export class GetIncidentTimelineUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_TIMELINE_REPOSITORY) private readonly timeline: IncidentTimelineRepository,
    @Inject(ALERTS_ENRICHMENT_READ_MODEL) private readonly reads: AlertsEnrichmentReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(incidentId: string): Promise<IncidentTimelineResult> {
    const incident = await this.incidents.findById(incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    const now = this.clock.now();

    const events = await this.timeline.listForIncident(incidentId);
    const resolverId = incident.resolvedByAdminId;
    const adminNames =
      resolverId === null ? new Map<string, string>() : await this.reads.adminNames([resolverId]);

    const raw: RawEntry[] = [this.reportedEntry(incident), ...events.map(toRaw)];
    const closure = this.closureEntry(incident, adminNames);
    if (closure !== null) {
      raw.push(closure);
    }

    const entries = raw
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((entry): IncidentTimelineEntryResult => ({
        at: entry.at.toISOString(),
        timeLabel: clockLabel(entry.at),
        dayLabel: dayLabel(entry.at, now),
        title: entry.title,
        description: entry.description,
        actor: formatActor(entry.actorName, entry.actorRole),
        kind: entry.kind,
      }));

    return {
      id: incident.id,
      reference: incidentNumber(incident.sequence, incident.createdAt),
      entries,
      generatedAt: now.toISOString(),
    };
  }

  private reportedEntry(incident: Incident): RawEntry {
    return {
      at: incident.createdAt,
      title: 'Incident Reported',
      description: incident.detail ?? 'Incident reported.',
      actorName: incident.reporterName,
      actorRole: incident.relatedCaregiverId === null ? 'Staff' : 'Caregiver',
      kind: 'REPORTED',
    };
  }

  private closureEntry(incident: Incident, adminNames: Map<string, string>): RawEntry | null {
    if (incident.resolvedAt === null) {
      return null;
    }
    const resolved = incident.status === IncidentStatus.Resolved;
    return {
      at: incident.resolvedAt,
      title: resolved ? 'Incident Resolved' : 'Incident Closed',
      description: resolved
        ? 'Incident marked resolved by the coordinator.'
        : 'Incident closed with no further action.',
      actorName:
        incident.resolvedByAdminId === null
          ? null
          : (adminNames.get(incident.resolvedByAdminId) ?? null),
      actorRole: 'Coordinator',
      kind: resolved ? 'RESOLVED' : 'CLOSED',
    };
  }
}

function toRaw(event: {
  at: Date;
  title: string;
  description: string;
  actorName: string | null;
  actorRole: string | null;
  kind: string;
}): RawEntry {
  return {
    at: event.at,
    title: event.title,
    description: event.description,
    actorName: event.actorName,
    actorRole: event.actorRole,
    kind: String(event.kind),
  };
}

function formatActor(name: string | null, role: string | null): string | null {
  if (name === null) {
    return null;
  }
  return role === null ? name : `${name} (${role})`;
}
