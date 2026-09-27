/** The six KPI cards at the top of the Scheduling console. */
export interface SchedulingSummaryResult {
  todaysVisits: number;
  upcomingVisits: number;
  availableCaregivers: number;
  unassignedVisits: number;
  scheduleConflicts: number;
  completedVisits: number;
}

/** One row of the Today's Schedule table. */
export interface SchedulingVisitResult {
  id: string;
  date: string;
  time: string;
  endTime: string;
  recipientName: string;
  caregiverId: string | null;
  caregiverName: string | null;
  service: string;
  status: string;
  priority: string;
  assignable: boolean;
}

/** A paginated set of visit rows. */
export interface SchedulingVisitPageResult {
  total: number;
  page: number;
  pageSize: number;
  rows: SchedulingVisitResult[];
}

/** The composed Scheduling console: KPIs, tab counts and the Today's Schedule table. */
export interface SchedulingConsoleResult {
  date: string;
  summary: SchedulingSummaryResult;
  tabCounts: { unassigned: number; conflicts: number };
  visits: SchedulingVisitPageResult;
}

/** One overlap between two visits assigned to the same caregiver. */
export interface SchedulingConflictResult {
  caregiverId: string;
  caregiverName: string | null;
  first: SchedulingVisitResult;
  second: SchedulingVisitResult;
}

/** One day column of the calendar feed. */
export interface SchedulingCalendarDayResult {
  date: string;
  visits: SchedulingVisitResult[];
}
