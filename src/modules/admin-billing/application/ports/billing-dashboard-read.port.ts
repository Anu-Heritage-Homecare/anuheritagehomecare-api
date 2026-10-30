import { Currency as PrismaCurrency } from '@prisma/client';

/** A sum paired with a count, as returned by an invoice aggregate. */
export interface AmountAndCountView {
  patientDueMinor: number;
  invoiceCount: number;
}

/** The four aging buckets of the outstanding patient due balance. */
export interface AgingBucketsView {
  days0to30Minor: number;
  days31to60Minor: number;
  days61to90Minor: number;
  days90PlusMinor: number;
}

/** One recorded payment, with the account it was taken against. */
export interface RecentPaymentView {
  sequence: number;
  accountName: string;
  amountMinor: number;
  methodLabel: string | null;
  receivedAt: Date;
}

/** One issued invoice, with its account, for the activity feed. */
export interface RecentInvoiceView {
  sequence: number;
  issuedAt: Date;
  accountName: string;
}

/** One overdue (PENDING, past due) invoice, with its account, for the activity feed. */
export interface OverdueInvoiceView {
  sequence: number;
  issuedAt: Date;
  dueDate: Date;
  accountName: string;
}

/**
 * The whole Billing dashboard assembled from the recipient invoicing tables for one
 * currency. All dates are raw; all money is minor units in the requested currency.
 */
export interface BillingDashboardView {
  /** Lifetime receipts (also the numerator of the collection rate). */
  collectedLifetimeMinor: number;
  paymentsThisMonthMinor: number;
  paymentsThisMonthCount: number;
  paymentsLastMonthMinor: number;
  /** Lifetime patient due billed across all invoices (collection rate denominator). */
  billedLifetimeMinor: number;
  billedThisMonthMinor: number;
  collectedThisMonthMinor: number;
  billedLastMonthMinor: number;
  collectedLastMonthMinor: number;
  outstanding: AmountAndCountView;
  overdue: AmountAndCountView;
  aging: AgingBucketsView;
  /** Receipts per month across the trailing window, oldest first. */
  revenueSeries: { monthStart: Date; totalMinor: number }[];
  recentPayments: RecentPaymentView[];
  recentInvoices: RecentInvoiceView[];
  overdueInvoices: OverdueInvoiceView[];
}

export interface BillingDashboardReadModel {
  /**
   * @param currency the market to scope every figure to
   * @param now the request instant (month boundaries and overdue cutoff derive from it)
   * @param months how many months the revenue trend spans
   * @param feedLimit how many rows to pull for each activity stream
   */
  dashboard(
    currency: PrismaCurrency,
    now: Date,
    months: number,
    feedLimit: number,
  ): Promise<BillingDashboardView>;
}

export const BILLING_DASHBOARD_READ_MODEL = Symbol('BILLING_DASHBOARD_READ_MODEL');
