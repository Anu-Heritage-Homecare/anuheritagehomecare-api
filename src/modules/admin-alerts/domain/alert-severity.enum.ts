/**
 * How urgent an alert is. The dashboard lists the most severe first, so each
 * severity carries a rank used for ordering (higher is more urgent).
 */
export enum AlertSeverity {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

/** Ordering rank per severity: higher is more urgent, surfaced first. */
export const ALERT_SEVERITY_RANK: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 4,
  [AlertSeverity.High]: 3,
  [AlertSeverity.Medium]: 2,
  [AlertSeverity.Low]: 1,
};
