/** One upcoming renewal on the timeline. */
export interface RenewalEntryResult {
  subscriptionId: string;
  clientName: string | null;
  planName: string;
  renewalDate: string;
  amountMinor: number;
  currency: string;
  /** Active monthly subscriptions renew automatically; derived from the status. */
  autoRenew: boolean;
}

/** A window of the Upcoming Renewals Timeline (today, this week, next week). */
export interface RenewalGroupResult {
  window: string;
  label: string;
  count: number;
  totalMinor: number;
  entries: RenewalEntryResult[];
}

export interface RenewalsResult {
  currency: string;
  generatedAt: string;
  /** Active subscriptions scanned for upcoming renewals. */
  scanned: number;
  /** True when more active subscriptions exist than the scan limit could cover. */
  capped: boolean;
  groups: RenewalGroupResult[];
}
