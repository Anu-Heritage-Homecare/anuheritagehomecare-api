import { Currency as PrismaCurrency } from '@prisma/client';

/** Subscription counts per lifecycle status, in one currency. */
export interface SubscriptionStatusCountsView {
  active: number;
  pendingPayment: number;
  paused: number;
  pastDue: number;
  cancelled: number;
}

/** Read model for the Subscription Status donut. Currency scoped. */
export interface SubscriptionStatusReadModel {
  statusCounts(currency: PrismaCurrency): Promise<SubscriptionStatusCountsView>;
}

export const SUBSCRIPTION_STATUS_READ_MODEL = Symbol('SUBSCRIPTION_STATUS_READ_MODEL');
