/** One row on the Incidents tab of the Alerts and Incidents screen. */
export interface IncidentRowResult {
  id: string;
  /** Human reference, e.g. "INC-NG-2026-00124". */
  incidentId: string;
  /** The category label, shown in the Description column. */
  description: string;
  /** Free text detail captured at report time, if any. */
  detail: string | null;
  /** Who reported it, or "Unassigned". */
  reporter: string;
  timeLabel: string;
  at: string;
  /** The severity, shown as the priority. */
  priority: string;
  /** Display status: Open, Resolved or Closed. */
  status: string;
}

export interface IncidentListResult {
  generatedAt: string;
  items: IncidentRowResult[];
}
