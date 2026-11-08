/** The Visit Performance cards. */
export interface VisitPerformanceResult {
  totalVisits: number;
  /** Change in total visits versus the previous period, null when there were none. */
  totalVisitsDeltaPercent: number | null;
  completed: number;
  completedPercent: number | null;
  cancelled: number;
  cancelledPercent: number | null;
  avgVisitDurationMinutes: number | null;
}

/** One point of the Visits by Day trend. */
export interface DailyTrendPointResult {
  date: string;
  visits: number;
}

/** One bar of the Visit Completion Rate chart. */
export interface WeeklyCompletionResult {
  label: string;
  completionPercent: number | null;
}

/** One slice of the Cancellation Reasons donut. */
export interface CancellationReasonResult {
  reason: string;
  count: number;
  percent: number;
}

/** One row of Top Service Types. */
export interface ServiceTypeResult {
  type: string;
  count: number;
}

/** The direction of a location's completion rate versus the previous period. */
export type LocationTrend = 'UP' | 'FLAT' | 'DOWN';

/** One row of Performance by Location. */
export interface LocationPerformanceResult {
  location: string;
  totalVisits: number;
  completionPercent: number | null;
  avgVisitDurationMinutes: number | null;
  satisfactionAvg: number | null;
  trend: LocationTrend;
}

/** The whole Operations Report drill down for one period and filter set. */
export interface OperationsReportResult {
  from: string;
  to: string;
  visitPerformance: VisitPerformanceResult;
  dailyTrend: DailyTrendPointResult[];
  weeklyCompletion: WeeklyCompletionResult[];
  cancellationReasons: CancellationReasonResult[];
  topServiceTypes: ServiceTypeResult[];
  locationPerformance: LocationPerformanceResult[];
}
