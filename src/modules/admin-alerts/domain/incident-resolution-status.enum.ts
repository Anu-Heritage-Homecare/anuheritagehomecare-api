/**
 * The disposition on an incident's resolution form. Placeholder option set pending
 * the real resolution dropdown values.
 */
export enum IncidentResolutionStatus {
  PendingResolution = 'PENDING_RESOLUTION',
  Resolved = 'RESOLVED',
  Escalated = 'ESCALATED',
}

/** The human label for a resolution status, e.g. "Pending Resolution". */
export const INCIDENT_RESOLUTION_STATUS_LABELS: Record<IncidentResolutionStatus, string> = {
  [IncidentResolutionStatus.PendingResolution]: 'Pending Resolution',
  [IncidentResolutionStatus.Resolved]: 'Resolved',
  [IncidentResolutionStatus.Escalated]: 'Escalated',
};
