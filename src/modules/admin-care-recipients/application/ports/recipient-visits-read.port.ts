import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';

/** The filter, search and pagination applied to one recipient's visit history. */
export interface RecipientVisitsFilter {
  recipientId: string;
  from: Date | null;
  to: Date | null;
  caregiverId: string | null;
  visitType: VisitType | null;
  status: VisitStatus | null;
  search: string | null;
  page: number;
  pageSize: number;
}

/** One raw visit row for the table, before caregiver name enrichment. */
export interface RecipientVisitRowView {
  id: string;
  caregiverId: string | null;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  visitType: VisitType;
  status: VisitStatus;
  clockInAt: Date | null;
  clockOutAt: Date | null;
}

export interface RecipientVisitsPageView {
  rows: RecipientVisitRowView[];
  /** Total rows matching the filter, for pagination. */
  total: number;
}

export interface VisitTypeCountView {
  visitType: VisitType;
  count: number;
}

export interface CaregiverVisitCountView {
  caregiverId: string;
  count: number;
}

/**
 * Aggregate figures over the whole visit history of one recipient (independent of
 * the table filter): the summary cards and the visit analytics. Kept as raw counts
 * so the use case can derive rates, the weekly trend and the caregiver names.
 */
export interface RecipientVisitsStatsView {
  totalVisits: number;
  completedVisits: number;
  thisMonthVisits: number;
  avgDurationMinutes: number;
  typeCounts: VisitTypeCountView[];
  caregiverCounts: CaregiverVisitCountView[];
  /** Scheduled dates of visits inside the trend window, for weekly bucketing. */
  trendDates: Date[];
}

/**
 * Read port over the visits table for one recipient's Visits tab. A dedicated query
 * model (not the domain repository) because it serves a filtered, paginated table
 * plus aggregates the aggregate does not need to know about.
 */
export interface RecipientVisitsReadModel {
  listPage(filter: RecipientVisitsFilter): Promise<RecipientVisitsPageView>;
  stats(recipientId: string, monthStart: Date, trendFrom: Date): Promise<RecipientVisitsStatsView>;
}

export const RECIPIENT_VISITS_READ_MODEL = Symbol('RECIPIENT_VISITS_READ_MODEL');
