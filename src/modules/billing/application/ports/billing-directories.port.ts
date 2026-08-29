/**
 * Read ports the billing context depends on, one per bounded context it composes:
 * the owner's subscriptions (bookings), the plan catalog (care plans) and the
 * payment history (payments). Each returns a plain view, never a foreign
 * aggregate, so billing depends only on these abstractions.
 */

/** A subscription as billing needs it. */
export interface BillingSubscriptionView {
  id: string;
  ownerId: string;
  careRecipientId: string;
  planType: string;
  currency: string;
  monthlyPriceMinor: number;
  startDate: Date;
  active: boolean;
}

export interface BillingSubscriptionDirectory {
  listActiveForOwner(ownerId: string): Promise<BillingSubscriptionView[]>;
  findById(subscriptionId: string): Promise<BillingSubscriptionView | null>;
}

export const BILLING_SUBSCRIPTION_DIRECTORY = Symbol('BILLING_SUBSCRIPTION_DIRECTORY');

export interface BillingPlanDirectory {
  /** The catalog display name for a plan type, or null if unknown. */
  nameForType(planType: string): Promise<string | null>;
}

export const BILLING_PLAN_DIRECTORY = Symbol('BILLING_PLAN_DIRECTORY');

/** One payment as billing needs it (a receipt, or a settled charge). */
export interface BillingPaymentView {
  id: string;
  currency: string;
  amountMinor: number;
  provider: string;
  reference: string;
  payableType: string;
  payableId: string;
  succeeded: boolean;
  createdAt: Date;
}

export interface BillingPaymentDirectory {
  listForOwner(ownerId: string): Promise<BillingPaymentView[]>;
  findForOwner(ownerId: string, paymentId: string): Promise<BillingPaymentView | null>;
}

export const BILLING_PAYMENT_DIRECTORY = Symbol('BILLING_PAYMENT_DIRECTORY');
