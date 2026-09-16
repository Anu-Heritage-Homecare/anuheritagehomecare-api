/** One slice of the Subscription Status donut. */
export interface StatusBucketResult {
  key: string;
  label: string;
  count: number;
  sharePercent: number;
}

export interface SubscriptionStatusResult {
  currency: string;
  totalAccounts: number;
  /** True when more active subscriptions exist than the renewal scan could cover. */
  capped: boolean;
  buckets: StatusBucketResult[];
}
