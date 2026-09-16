/** One row of the Subscription Management table. */
export interface SubscriptionRowResult {
  id: string;
  clientName: string | null;
  accountHolderName: string | null;
  planType: string;
  planName: string;
  billingCycle: string;
  status: string;
  startDate: string;
  /** Next billing date, derived from the monthly cadence; null once cancelled. */
  nextRenewalDate: string | null;
  monthlyPriceMinor: number;
  currency: string;
  /**
   * Auto renew is not stored separately; an active subscription renews by default,
   * so this is derived from the status rather than a captured preference.
   */
  autoRenew: boolean;
  /** Monthly plans do not carry an hour balance, so this is always null here. */
  remainingHours: number | null;
}

export interface SubscriptionListResult {
  currency: string;
  total: number;
  page: number;
  pageSize: number;
  rows: SubscriptionRowResult[];
}
