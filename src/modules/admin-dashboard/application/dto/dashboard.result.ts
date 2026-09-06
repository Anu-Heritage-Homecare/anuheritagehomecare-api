import { AlertResult } from '@modules/admin-alerts/application/dto/alert.result';

/** The six Operations Snapshot tiles. */
export interface OperationsSnapshot {
  activeHomeVisits: number;
  scheduledToday: number;
  /** Share of today's visits that are completed, 0 to 100. */
  scheduledCompletionPercent: number;
  availableCaregivers: number;
  totalCaregivers: number;
  visitsStartingSoon: number;
  criticalAlerts: number;
  /** Composite care quality score, 0 to 100, or null when there is no data yet. */
  careQualityScore: number | null;
}

/** One row of Today's Schedule. */
export interface ScheduleItem {
  visitId: string;
  startMinute: number;
  endMinute: number;
  recipientName: string;
  caregiverName: string | null;
  visitType: string;
  status: string;
  priority: string;
}

/** One entry of the Recent Activity Timeline. */
export interface ActivityItem {
  type: string;
  description: string;
  occurredAt: Date;
}

/** The Performance Snapshot figures. */
export interface PerformanceSnapshot {
  completionRatePercent: number;
  /** Mean arrival delta in minutes (negative is early), or null when none clocked in. */
  averageArrivalDeltaMinutes: number | null;
  /** Mean satisfaction score (1 to 5), or null when there are no ratings. */
  clientSatisfaction: number | null;
  clientSatisfactionCount: number;
  openTasks: number;
  /**
   * Revenue booked today. Deferred: payments are stored per currency (USD and NGN)
   * and cannot be summed into one figure, so this is surfaced as null until a per
   * market revenue read exists rather than showing a misleading mixed total.
   */
  revenueTodayMinor: number | null;
}

/** The whole operations dashboard, as one read. */
export interface DashboardResult {
  operations: OperationsSnapshot;
  todaysSchedule: ScheduleItem[];
  criticalAlerts: AlertResult[];
  activityTimeline: ActivityItem[];
  performance: PerformanceSnapshot;
}
