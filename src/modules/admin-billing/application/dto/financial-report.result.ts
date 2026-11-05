import { AgingBucket, ReportComparison } from '../ports/financial-reports-read.port';

export interface FinancialReportKpisResult {
  totalRevenueMinor: number;
  /** Change in revenue versus the comparison window, or null when it had none. */
  revenueDeltaPercent: number | null;
  collectionsMinor: number;
  /** Collections over revenue, or null when there was no revenue. */
  collectionRatePercent: number | null;
  outstandingMinor: number;
  pendingInvoiceCount: number;
  writeOffsMinor: number;
  /** Write offs over revenue, or null when there was no revenue. */
  lossRatePercent: number | null;
}

export interface MonthlyRevenuePointResult {
  monthStart: string;
  revenueMinor: number;
}

export interface CollectionMethodShareResult {
  method: string;
  amountMinor: number;
  sharePercent: number;
}

export interface AgingBucketResult {
  bucket: AgingBucket;
  invoiceCount: number;
  totalMinor: number;
  percent: number;
}

export interface FinancialReportResult {
  currency: string;
  from: string;
  to: string;
  branch: string | null;
  comparison: ReportComparison;
  kpis: FinancialReportKpisResult;
  monthlyRevenue: MonthlyRevenuePointResult[];
  collectionsByMethod: CollectionMethodShareResult[];
  aging: AgingBucketResult[];
}
