/** Structured filters shared by the Monitoring History tabs. */
export interface MonitoringHistoryFilter {
  /** Lower bound: only records at or after this instant. */
  from: Date;
  branch: string | null;
  careRecipientId: string | null;
  caregiverId: string | null;
}

/** The Past Alerts tab's own filters (priority and alert type), added to the shared ones. */
export interface PastAlertsFilter {
  severity: string | null;
  alertType: string | null;
}

/** The Past Incidents tab's own filters (type, priority and outcome), added to the shared ones. */
export interface PastIncidentsFilter {
  category: string | null;
  severity: string | null;
  /** RESOLVED, CLOSED or null for both. */
  status: string | null;
}

/** One completed visit row, hydrated with the names and the caregiver branch. */
export interface CompletedVisitRow {
  id: string;
  sequence: number;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  recipientName: string;
  caregiverName: string | null;
  caregiverBranch: string | null;
}

/** One past (resolved or dismissed) operational alert row. */
export interface PastAlertRow {
  id: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: Date;
  resolvedAt: Date;
  resolvedByAdminId: string | null;
  recipientName: string | null;
  caregiverBranch: string | null;
}

/** One past (resolved or closed) incident row. */
export interface PastIncidentRow {
  id: string;
  sequence: number;
  category: string;
  severity: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date;
  resolvedByAdminId: string | null;
  reporterName: string | null;
  recipientName: string | null;
}

/**
 * Read model for the Monitoring History screen. Each method applies the structured
 * filters in the database and returns up to `cap` rows (newest first); the derived
 * "late" classification, the status subfilter and pagination are applied in the use
 * case. Queries the owning contexts' tables directly (the read model pattern).
 */
export interface MonitoringHistoryReadModel {
  completedVisits(filter: MonitoringHistoryFilter, cap: number): Promise<CompletedVisitRow[]>;
  pastAlerts(
    filter: MonitoringHistoryFilter,
    alertFilter: PastAlertsFilter,
    cap: number,
  ): Promise<PastAlertRow[]>;
  pastIncidents(
    filter: MonitoringHistoryFilter,
    incidentFilter: PastIncidentsFilter,
    cap: number,
  ): Promise<PastIncidentRow[]>;
}

export const MONITORING_HISTORY_READ_MODEL = Symbol('MONITORING_HISTORY_READ_MODEL');
