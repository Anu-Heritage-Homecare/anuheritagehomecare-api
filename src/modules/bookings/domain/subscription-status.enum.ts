/** Lifecycle of a monthly plan subscription. */
export enum SubscriptionStatus {
  PendingPayment = 'PENDING_PAYMENT',
  Active = 'ACTIVE',
  PastDue = 'PAST_DUE',
  Cancelled = 'CANCELLED',
}
