/**
 * Lifecycle of an operational alert. OPEN alerts demand action and are counted on
 * the dashboard. RESOLVED means the coordinator actioned it; DISMISSED means it
 * was acknowledged as not needing action. Both are terminal.
 */
export enum AlertStatus {
  Open = 'OPEN',
  Resolved = 'RESOLVED',
  Dismissed = 'DISMISSED',
}
