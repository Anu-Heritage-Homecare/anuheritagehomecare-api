import { INCIDENT_CATEGORY_LABELS } from '../domain/incident-category.enum';
import { IncidentStatus } from '../domain/incident-status.enum';
import { Incident } from '../domain/incident.entity';
import { IncidentRowResult } from './dto/incident.result';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// shortcut: single market reference prefix; thread the recipient's market through
// when incidents span more than Nigeria.
const MARKET_CODE = 'NG';

/** The human incident reference, e.g. "INC-NG-2026-00124", from its sequence. */
export function incidentNumber(sequence: number | null, createdAt: Date): string {
  const serial = sequence === null ? '00000' : String(sequence).padStart(5, '0');
  return `INC-${MARKET_CODE}-${createdAt.getUTCFullYear()}-${serial}`;
}

/** Map an incident to its table row for the Incidents tab. */
export function toIncidentRow(incident: Incident, now: Date): IncidentRowResult {
  return {
    id: incident.id,
    incidentId: incidentNumber(incident.sequence, incident.createdAt),
    description: INCIDENT_CATEGORY_LABELS[incident.category],
    detail: incident.detail,
    reporter: incident.reporterName ?? 'Unassigned',
    timeLabel: ageLabel(incident.createdAt, now),
    at: incident.createdAt.toISOString(),
    priority: String(incident.severity),
    status: statusLabel(incident.status),
  };
}

function statusLabel(status: IncidentStatus): string {
  switch (status) {
    case IncidentStatus.Open:
      return 'Open';
    case IncidentStatus.Resolved:
      return 'Resolved';
    default:
      return 'Closed';
  }
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
