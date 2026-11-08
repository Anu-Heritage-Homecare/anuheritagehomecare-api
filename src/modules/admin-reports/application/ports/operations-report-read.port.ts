import { VisitStatus, VisitType } from '@prisma/client';

/** The filters of the Operations Report (reporting period plus the four dropdowns). */
export interface OperationsReportFilter {
  from: Date;
  to: Date;
  /** The Service Type dropdown; null is All Services. */
  visitType: VisitType | null;
  /** The Caregiver dropdown; null is All Caregivers. */
  caregiverId: string | null;
  /** The Status dropdown; null is All Statuses. */
  status: VisitStatus | null;
  /** The Branch dropdown, matched to the care recipient city; null is All Branches. */
  city: string | null;
}

/** Visit counts and worked time for a set of visits. */
export interface OpsVisitCounts {
  total: number;
  completed: number;
  cancelled: number;
  loggedSeconds: number;
  durationCount: number;
}

/** One day of the Visits by Day trend. */
export interface OpsDailyPoint {
  date: Date;
  visits: number;
}

/** One week bucket of the Visit Completion Rate chart. */
export interface OpsWeeklyBucket {
  label: string;
  completed: number;
  total: number;
}

/** One slice of the Cancellation Reasons donut (reason is the enum value or UNSPECIFIED). */
export interface OpsCancellationReason {
  reason: string;
  count: number;
}

/** One row of Top Service Types. */
export interface OpsServiceType {
  type: string;
  count: number;
}

/** One city bucket of Performance by Location. */
export interface OpsLocationBucket {
  city: string;
  total: number;
  completed: number;
  loggedSeconds: number;
  durationCount: number;
  satisfactionSum: number;
  satisfactionCount: number;
  /** The city's completion rate (completed over total) in the previous period, null when none. */
  previousCompletionRate: number | null;
}

/** The raw aggregates behind the Operations Report; percentages are derived in the use case. */
export interface OperationsReportView {
  current: OpsVisitCounts;
  /** Total visits in the equal length window just before the period (for the delta). */
  previousTotal: number;
  daily: OpsDailyPoint[];
  weekly: OpsWeeklyBucket[];
  cancellationReasons: OpsCancellationReason[];
  serviceTypes: OpsServiceType[];
  locations: OpsLocationBucket[];
}

/** Org wide read model for the Operations Report drill down. */
export interface OperationsReportReadModel {
  report(filter: OperationsReportFilter): Promise<OperationsReportView>;
}

export const OPERATIONS_REPORT_READ_MODEL = Symbol('OPERATIONS_REPORT_READ_MODEL');
