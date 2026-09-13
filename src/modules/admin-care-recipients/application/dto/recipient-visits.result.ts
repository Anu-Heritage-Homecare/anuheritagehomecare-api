export interface VisitsSummaryResult {
  /** Every visit ever scheduled for the recipient. */
  totalVisits: number;
  /** Visits scheduled in the current calendar month. */
  thisMonthVisits: number;
  /** Average scheduled duration across the history, in whole hours to one decimal. */
  avgDurationHours: number;
  /** Successful (completed) visits over total, as a percentage to one decimal. */
  completionRatePercent: number;
  /** Numerator behind the completion rate (completed visits). */
  successfulVisits: number;
}

export interface VisitRowResult {
  id: string;
  date: Date;
  startMinute: number;
  endMinute: number;
  caregiverId: string | null;
  caregiverName: string | null;
  visitType: string;
  durationMinutes: number;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  status: string;
  /** Completed but the caregiver clocked in after the scheduled start (with grace). */
  lateArrival: boolean;
}

export interface VisitsPageResult {
  items: VisitRowResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MostCommonVisitTypeResult {
  visitType: string;
  percent: number;
}

export interface PrimaryCaregiverCoverageResult {
  caregiverId: string;
  name: string | null;
  visitCount: number;
  percent: number;
}

export interface VisitsAnalyticsResult {
  /** Visit count per week across the trend window, oldest week first. */
  weeklyCounts: number[];
  /** Change of the recent half of the window against the prior half, as a percentage. */
  visitsPerWeekTrendPercent: number | null;
  mostCommonVisitType: MostCommonVisitTypeResult | null;
  primaryCaregiverCoverage: PrimaryCaregiverCoverageResult | null;
}

export interface CaregiverOptionResult {
  id: string;
  name: string | null;
}

export interface RecipientVisitsResult {
  summary: VisitsSummaryResult;
  /** Distinct caregivers with a visit for this recipient, for the filter dropdown. */
  caregivers: CaregiverOptionResult[];
  page: VisitsPageResult;
  analytics: VisitsAnalyticsResult;
}
