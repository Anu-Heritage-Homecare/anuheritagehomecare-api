/**
 * Lifecycle of an operational alert. OPEN (shown as Active) demands action;
 * ACKNOWLEDGED means a coordinator has seen it; INVESTIGATING means they are working
 * it. All three are active. RESOLVED (actioned) and DISMISSED (no action needed) are
 * terminal.
 */
export enum AlertStatus {
  Open = 'OPEN',
  Acknowledged = 'ACKNOWLEDGED',
  Investigating = 'INVESTIGATING',
  Resolved = 'RESOLVED',
  Dismissed = 'DISMISSED',
}

/** The non terminal (active) statuses: still demanding attention. */
export const ACTIVE_ALERT_STATUSES: readonly AlertStatus[] = [
  AlertStatus.Open,
  AlertStatus.Acknowledged,
  AlertStatus.Investigating,
];

/** Whether a status is still active (not resolved or dismissed). */
export function isActiveStatus(status: AlertStatus): boolean {
  return ACTIVE_ALERT_STATUSES.includes(status);
}
