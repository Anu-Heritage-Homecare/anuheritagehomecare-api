/** The flexible hours usage on a subscription row (Flexible plans only). */
export interface FlexibleHoursUsageResult {
  allocatedHours: number;
  usedHours: number;
  remainingHours: number;
  percentUsed: number;
}

/** One enriched row of the Active Subscriptions table. */
export interface EnrichedSubscriptionRowResult {
  id: string;
  clientName: string | null;
  patientAge: number | null;
  accountHolderName: string | null;
  planType: string;
  planName: string;
  status: string;
  autoRenew: boolean;
  billingCycle: string;
  renewalDate: string | null;
  monthlyPriceMinor: number;
  currency: string;
  coordinatorName: string | null;
  caregiverName: string | null;
  flexibleHours: FlexibleHoursUsageResult | null;
}

export interface EnrichedSubscriptionListResult {
  currency: string;
  total: number;
  page: number;
  pageSize: number;
  rows: EnrichedSubscriptionRowResult[];
}

/** The Subscriptions KPI bar figures. */
export interface SubscriptionKpisResult {
  currency: string;
  totalActive: number;
  paused: number;
  pendingActivation: number;
  cancelled: number;
  renewingSoon: number;
  expiring: number;
  /** True when more active subscriptions exist than the KPI scan could cover. */
  capped: boolean;
}
