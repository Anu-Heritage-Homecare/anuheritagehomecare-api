import {
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';

/** One month bucket of settled revenue, in the panel's currency. */
export interface MonthlyRevenuePointView {
  monthStart: Date;
  totalMinor: number;
}

/** Active subscription count and recurring revenue for one monthly plan. */
export interface PlanSubscriptionStatView {
  planType: PrismaCarePlanType;
  activeSubscriptions: number;
  monthlyRevenueMinor: number;
}

/**
 * The raw figures behind the Plans and Billing overview, all scoped to a single
 * currency so every total is an honest sum (never a mixed cross currency figure).
 * Derivations (growth, shares, averages, labels) are computed in the use case.
 */
export interface PlansBillingOverviewView {
  billedTodayMinor: number;
  monthlyRevenueMinor: number;
  lastMonthRevenueMinor: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  newSubscriptionsThisMonth: number;
  cancelledThisMonth: number;
  // Care requests carry no currency or price, so this is a global operational count.
  pendingCareRequests: number;
  distribution: PlanSubscriptionStatView[];
  revenueSeries: MonthlyRevenuePointView[];
  flexibleBookingsThisMonth: number;
  flexibleRevenueThisMonthMinor: number;
}

/** One row of the Subscription Management table (names resolved in batch). */
export interface SubscriptionRowView {
  id: string;
  recipientName: string | null;
  accountHolderName: string | null;
  planType: PrismaCarePlanType;
  status: PrismaSubscriptionStatus;
  startDate: Date;
  monthlyPriceMinor: number;
}

/** A page of subscription rows plus the total matching the filter. */
export interface SubscriptionPageView {
  total: number;
  rows: SubscriptionRowView[];
}

/**
 * Read model over the billing, subscription, booking and care request tables for
 * the admin Plans and Billing control panel. Currency scoped.
 */
export interface PlansBillingReadModel {
  overview(currency: PrismaCurrency, now: Date): Promise<PlansBillingOverviewView>;
  listSubscriptions(
    currency: PrismaCurrency,
    status: PrismaSubscriptionStatus | null,
    page: number,
    pageSize: number,
  ): Promise<SubscriptionPageView>;
}

export const PLANS_BILLING_READ_MODEL = Symbol('PLANS_BILLING_READ_MODEL');
