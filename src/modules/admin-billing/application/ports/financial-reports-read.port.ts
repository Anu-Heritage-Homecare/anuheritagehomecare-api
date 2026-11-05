import { Currency as PrismaCurrency } from '@prisma/client';

/** The comparison basis for the revenue delta (the Comparison control). */
export type ReportComparison = 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR';

/** The four aging buckets of the outstanding balance, by age of the receivable. */
export type AgingBucket = 'CURRENT' | 'DAYS_31_60' | 'DAYS_61_90' | 'DAYS_90_PLUS';

export interface FinancialReportFilter {
  /** The market to scope every figure to; revenue is never summed across currencies. */
  currency: PrismaCurrency;
  /** The selected reporting window (inclusive start, exclusive end). */
  from: Date;
  to: Date;
  /** The comparison window the revenue delta is measured against. */
  previousFrom: Date;
  previousTo: Date;
  /** A branch name to scope to, or null for every branch. */
  branch: string | null;
  /** The request instant; the 6 month trend and the aging snapshot derive from it. */
  now: Date;
}

/** The raw KPI sums; the use case derives the rates and deltas from these. */
export interface FinancialReportKpisView {
  /** Patient due billed in the window (Total Revenue). */
  totalRevenueMinor: number;
  /** Patient due billed in the comparison window. */
  previousRevenueMinor: number;
  /** Payments received in the window (Collections). */
  collectionsMinor: number;
  /** Patient due still unpaid across all pending invoices (a current snapshot). */
  outstandingMinor: number;
  pendingInvoiceCount: number;
  /** Write offs applied in the window. */
  writeOffsMinor: number;
}

export interface MonthlyRevenuePointView {
  monthStart: Date;
  revenueMinor: number;
}

export interface CollectionMethodShareView {
  method: string;
  amountMinor: number;
}

export interface AgingBucketView {
  bucket: AgingBucket;
  invoiceCount: number;
  totalMinor: number;
}

export interface FinancialReportView {
  currency: string;
  kpis: FinancialReportKpisView;
  /** Billed revenue per month across the trailing 6 months, oldest first. */
  monthlyRevenue: MonthlyRevenuePointView[];
  /** Payment volume by method in the window. */
  collectionsByMethod: CollectionMethodShareView[];
  /** The outstanding balance split into the four aging buckets. */
  aging: AgingBucketView[];
}

export interface FinancialReportsReadModel {
  report(filter: FinancialReportFilter): Promise<FinancialReportView>;
}

export const FINANCIAL_REPORTS_READ_MODEL = Symbol('FINANCIAL_REPORTS_READ_MODEL');
