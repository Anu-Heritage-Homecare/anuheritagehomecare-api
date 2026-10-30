/** The top KPI cards on the Alerts and Incidents screen. */
export interface AlertsOverviewKpisResult {
  activeAlerts: number;
  highPriority: number;
  critical: number;
  openIncidents: number;
  resolvedToday: number;
}

/** The tab counts (these partition `all`: active alerts + incidents + emergencies + resolved). */
export interface AlertsOverviewCountsResult {
  all: number;
  activeAlerts: number;
  incidents: number;
  emergencies: number;
  resolved: number;
}

/** One row in the Alerts and Incidents table. */
export interface AlertRowResult {
  id: string;
  /** ALERT or EMERGENCY (incidents have their own tab and endpoint). */
  kind: string;
  /** Display label of the alert type, e.g. "Missed Check-in". */
  type: string;
  description: string;
  /** The care recipient the alert concerns. */
  source: string;
  timeLabel: string;
  at: string;
  /** The severity, shown as the priority. */
  priority: string;
  /** Display status: New, Acknowledged, Investigating, Resolved or Dismissed. */
  status: string;
}

export interface AlertsOverviewResult {
  generatedAt: string;
  kpis: AlertsOverviewKpisResult;
  counts: AlertsOverviewCountsResult;
  items: AlertRowResult[];
}
