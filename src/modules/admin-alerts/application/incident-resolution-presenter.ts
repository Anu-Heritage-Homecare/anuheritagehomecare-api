import { INCIDENT_RESOLUTION_STATUS_LABELS } from '../domain/incident-resolution-status.enum';
import { IncidentResolution } from '../domain/incident-resolution.entity';
import { Incident } from '../domain/incident.entity';
import { IncidentResolutionResult } from './dto/incident-resolution.result';
import { dateLabel } from './incident-detail-presenter';
import { incidentNumber } from './incident-presenter';
import { compactDuration } from './resolved-presenter';

/** Build the Resolution tab result from the incident, its resolution draft and the resolver name. */
export function toResolutionResult(
  incident: Incident,
  resolution: IncidentResolution,
  resolverName: string | null,
  now: Date,
): IncidentResolutionResult {
  const resolvedAt = incident.resolvedAt;
  return {
    id: incident.id,
    reference: incidentNumber(incident.sequence, incident.createdAt),
    status: String(resolution.status),
    statusLabel: INCIDENT_RESOLUTION_STATUS_LABELS[resolution.status],
    summary: resolution.summary,
    actionsTaken: resolution.actionsTaken,
    followUpRequired: resolution.followUpRequired,
    followUpDate: resolution.followUpDate === null ? null : isoDate(resolution.followUpDate),
    followUpDateLabel: resolution.followUpDate === null ? null : dateLabel(resolution.followUpDate),
    followUpNotes: resolution.followUpNotes,
    resolvedBy: resolvedAt === null ? null : resolverName,
    resolutionTimeLabel:
      resolvedAt === null
        ? null
        : compactDuration(resolvedAt.getTime() - incident.createdAt.getTime()),
    resolved: resolvedAt !== null,
    generatedAt: now.toISOString(),
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
