/**
 * Where an incident is in its lifecycle. Open when filed, Under Review once a
 * coordinator is working it, then Resolved (actioned) or Closed (no further
 * action). Open and Under Review both count as active.
 */
export enum IncidentStatus {
  Open = 'OPEN',
  UnderReview = 'UNDER_REVIEW',
  Resolved = 'RESOLVED',
  Closed = 'CLOSED',
}

/** Whether an incident is still active (counts toward the Open Incidents figure). */
export function isActiveIncidentStatus(status: IncidentStatus): boolean {
  return status === IncidentStatus.Open || status === IncidentStatus.UnderReview;
}
