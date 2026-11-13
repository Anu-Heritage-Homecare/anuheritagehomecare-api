import { Currency as PrismaCurrency } from '@prisma/client';

/** Counts and totals for a set of visits, used for both the range and each month. */
export interface VisitAggregate {
  total: number;
  completed: number;
  cancelled: number;
  missed: number;
  /** Visits with a recorded clock in (the caregiver showed up). */
  started: number;
  /** Started visits where the clock in fell within the on time grace of the schedule. */
  onTime: number;
  /** Sum of worked seconds (clock out minus clock in) for completed visits. */
  loggedSeconds: number;
  /** Completed visits that contributed a worked duration. */
  durationCount: number;
}

/** One month bucket of the six month trend. */
export interface MonthlyVisitBucket {
  monthStart: Date;
  visits: VisitAggregate;
}

/** One month bucket of collected revenue. */
export interface MonthlyRevenueBucket {
  monthStart: Date;
  revenueMinor: number;
}

/**
 * The raw aggregates that back the Reports Overview, for one market and date range.
 * Percentages, averages and capacity scaling are derived in the use case so the read
 * model stays a pure data roll up.
 */
export interface ReportsAggregateView {
  currency: PrismaCurrency;
  /** Visit aggregates over the selected range. */
  range: VisitAggregate;
  /** Visits scheduled within the current calendar month. */
  visitsThisMonth: number;
  /** Six month visit trend, oldest first. */
  monthly: MonthlyVisitBucket[];
  /** Rating counts indexed 0..4 for scores 1..5, over the selected range. */
  ratingCounts: number[];
  ratingSum: number;
  ratingCount: number;
  /** Active, non archived caregivers. */
  activeCaregivers: number;
  /** Sum of weekly capacity hours across active caregivers (maxHoursPerWeek, defaulted). */
  weeklyCapacityHours: number;
  /** Active caregivers carrying at least one expired certification. */
  caregiversWithExpiredCerts: number;
  /** Collected revenue (payments net of refunds, excluding credit settlements) in the range. */
  revenueMinor: number;
  /** Collected revenue from the start of the current year to now. */
  ytdRevenueMinor: number;
  /** Collected revenue within the current calendar month. */
  currentMonthRevenueMinor: number;
  /** Six month collected revenue trend, oldest first. */
  monthlyRevenue: MonthlyRevenueBucket[];
  /** Patient due billed on invoices issued in the range (excluding cancelled and written off). */
  billedMinor: number;
  /** Count of invoices issued in the range (excluding cancelled and written off). */
  invoiceCount: number;
  /** Patient due outstanding on pending invoices. */
  outstandingMinor: number;
}

export interface ReportsAggregateQuery {
  currency: PrismaCurrency;
  from: Date;
  to: Date;
  now: Date;
}

/** Org wide read model for the admin Reports Overview, scoped to one market. */
export interface ReportsOverviewReadModel {
  aggregate(query: ReportsAggregateQuery): Promise<ReportsAggregateView>;
}

export const REPORTS_OVERVIEW_READ_MODEL = Symbol('REPORTS_OVERVIEW_READ_MODEL');
