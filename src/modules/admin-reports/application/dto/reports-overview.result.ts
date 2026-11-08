/** The top KPI strip. Money is minor units in the market currency; rates are percentages. */
export interface ReportsKpisResult {
  totalVisits: number;
  caregiverUtilizationPercent: number | null;
  revenueMinor: number;
  clientSatisfactionAvg: number | null;
  visitCompletionPercent: number | null;
  outstandingMinor: number;
}

/** One point of the Monthly Performance Trends chart. */
export interface MonthlyPerformanceResult {
  monthStart: string;
  completionPercent: number | null;
  utilizationPercent: number | null;
}

/** One revenue bar of the Revenue Overview chart. */
export interface MonthlyRevenueResult {
  monthStart: string;
  revenueMinor: number;
}

export interface RevenueOverviewResult {
  ytdRevenueMinor: number;
  monthly: MonthlyRevenueResult[];
}

export interface OperationalPerformanceResult {
  visitsThisMonth: number;
  avgVisitDurationMinutes: number | null;
  onTimeRatePercent: number | null;
  cancellationRatePercent: number | null;
}

export interface WorkforceSummaryResult {
  activeCaregivers: number;
  avgRating: number | null;
  trainingCompliancePercent: number | null;
  attendanceRatePercent: number | null;
}

export interface FinancialSummaryResult {
  monthlyRevenueMinor: number;
  collectionRatePercent: number | null;
  avgInvoiceMinor: number | null;
  outstandingMinor: number;
}

/** One row of the Client Satisfaction Breakdown (score 1..5). */
export interface SatisfactionBreakdownResult {
  score: number;
  count: number;
  percent: number;
}

/** One entry of the Recent Report Activity feed. */
export interface ReportActivityResult {
  id: string;
  type: string;
  title: string;
  format: string;
  generatedAt: string;
  generatedByLabel: string | null;
}

/** The whole Reports Overview screen in one read, for one market and date range. */
export interface ReportsOverviewResult {
  currency: string;
  from: string;
  to: string;
  kpis: ReportsKpisResult;
  monthlyPerformance: MonthlyPerformanceResult[];
  revenueOverview: RevenueOverviewResult;
  operationalPerformance: OperationalPerformanceResult;
  workforceSummary: WorkforceSummaryResult;
  financialSummary: FinancialSummaryResult;
  satisfactionBreakdown: SatisfactionBreakdownResult[];
  recentReports: ReportActivityResult[];
}
