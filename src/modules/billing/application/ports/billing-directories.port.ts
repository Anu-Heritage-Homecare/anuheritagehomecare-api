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

/** A plan's price and provider references in one currency. */
export interface BillingPlanPriceView {
  monthlyPriceMinor: number;
  stripePriceId: string | null;
  paystackPlanCode: string | null;
}

export interface BillingPlanDirectory {
  /** The catalog display name for a plan type, or null if unknown. */
  nameForType(planType: string): Promise<string | null>;
  /** The plan's monthly price and provider references for a currency, or null. */
  priceForType(planType: string, currency: string): Promise<BillingPlanPriceView | null>;
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

/** The owner's default saved card, as billing needs to show it. */
export interface BillingCardView {
  brand: string;
  last4: string;
}

export interface BillingPaymentDirectory {
  listForOwner(ownerId: string): Promise<BillingPaymentView[]>;
  findForOwner(ownerId: string, paymentId: string): Promise<BillingPaymentView | null>;
  /** The owner's default saved card, or null when none is on file. */
  defaultCardForOwner(ownerId: string): Promise<BillingCardView | null>;
}

export const BILLING_PAYMENT_DIRECTORY = Symbol('BILLING_PAYMENT_DIRECTORY');
