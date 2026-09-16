/** One Care Plan Distribution and Performance card. */
export interface PlanCardResult {
  planType: string;
  planName: string;
  billingModel: string;
  subscribers: number;
  monthlyRevenueMinor: number;
  unitPriceMinor: number | null;
  /** Share of ever activated subscriptions on this plan still active; null for Flexible. */
  retentionPercent: number | null;
  /**
   * Approximate renewal rate: active share among subscriptions old enough to have
   * reached a renewal. A precise figure awaits recurring billing being operational.
   * Null for Flexible.
   */
  renewalPercent: number | null;
  /** MOST_POPULAR (most subscribers) or HIGH_YIELD (most revenue), when it leads. */
  badge: string | null;
}

export interface PlanPerformanceCardsResult {
  currency: string;
  cards: PlanCardResult[];
}
