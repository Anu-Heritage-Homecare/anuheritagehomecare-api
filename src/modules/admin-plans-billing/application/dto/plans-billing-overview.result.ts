/** Top row stat cards. All money is minor units in the panel's single currency. */
export interface PlansBillingKpisResult {
  billedTodayMinor: number;
  monthlyRevenueMinor: number;
  /** Month over month revenue change; null when there is no prior month revenue. */
  monthlyGrowthPercent: number | null;
  activeSubscriptions: number;
  pendingCareRequests: number;
  newSubscriptionsThisMonth: number;
  pastDueSubscriptions: number;
}

/** One point on the Monthly Revenue Analytics chart. */
export interface RevenuePointResult {
  label: string;
  monthStart: string;
  totalMinor: number;
}

/** One slice of the Subscription Distribution donut. */
export interface SubscriptionDistributionResult {
  planType: string;
  planName: string;
  activeSubscriptions: number;
  sharePercent: number;
  monthlyRevenueMinor: number;
}

/** One card in the Plan Performance Snapshot. */
export interface PlanPerformanceResult {
  planType: string;
  planName: string;
  billingModel: string;
  subscribers: number;
  monthlyRevenueMinor: number;
  /** Catalog unit price in this currency (hourly for Flexible, monthly otherwise). */
  unitPriceMinor: number | null;
}

/** Operational Revenue Insights panel. */
export interface OperationalInsightsResult {
  averageMonthlySpendMinor: number | null;
  /**
   * Customer lifetime value needs a churn and tenure model that is not built yet,
   * so it is surfaced as null rather than an invented figure.
   */
  customerLifetimeValueMinor: number | null;
  recurringRevenueMinor: number;
  /** The single market this currency serves (US for USD, NG for NGN). */
  market: string;
  marketRevenueMinor: number;
  netNewSubscriptions: number;
  /** Share of active subscriptions on Premium or Live in plans. */
  premiumExpansionRatePercent: number | null;
}

export interface PlansBillingOverviewResult {
  currency: string;
  generatedAt: string;
  kpis: PlansBillingKpisResult;
  revenueSeries: RevenuePointResult[];
  distribution: SubscriptionDistributionResult[];
  planPerformance: PlanPerformanceResult[];
  insights: OperationalInsightsResult;
}
