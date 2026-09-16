/** One entry in the Operational Alerts Queue. */
export interface OperationalAlertResult {
  key: string;
  severity: string;
  title: string;
  detail: string;
  /** How many items the alert covers; null when the signal is not tracked yet. */
  count: number | null;
  /** False when the alert cannot be computed from current data. */
  available: boolean;
}

export interface OperationalAlertsResult {
  currency: string;
  generatedAt: string;
  alerts: OperationalAlertResult[];
}
