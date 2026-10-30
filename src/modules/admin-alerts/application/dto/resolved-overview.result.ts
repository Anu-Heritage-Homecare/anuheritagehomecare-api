/** One row on the Resolved tab of the Alerts and Incidents screen. */
export interface ResolvedRowResult {
  id: string;
  /** ALERT, INCIDENT or EMERGENCY. */
  kind: string;
  /** Display label of the alert/incident/emergency type. */
  type: string;
  description: string;
  /** The care recipient the item concerned. */
  source: string;
  /** Who resolved it: an admin name, or "System Auto" for an automatic resolution. */
  resolvedBy: string;
  /** How long ago it was resolved, e.g. "4h ago". */
  resolvedDateLabel: string;
  resolvedAt: string;
  /** Time from raised to resolved, e.g. "1h". */
  resolutionTimeLabel: string;
}

export interface ResolvedOverviewResult {
  generatedAt: string;
  /** Average resolution time across the window, e.g. "24 mins" (null if none). */
  avgResolutionLabel: string | null;
  items: ResolvedRowResult[];
}
