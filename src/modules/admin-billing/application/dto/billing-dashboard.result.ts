/**
 * The admin Billing dashboard, one market (currency) at a time. Every money figure
 * is minor units in that single currency; cross currency totals are never mixed.
 */

/** The five stat cards across the top of the Billing dashboard. */
export interface BillingDashboardKpisResult {
  /** All payments received to date, in this currency. */
  totalRevenueMinor: number;
  /** This month's receipts versus last month's; null when last month had none. */
  totalRevenueGrowthPercent: number | null;
  /** Patient due still owed on PENDING invoices. */
  outstandingBalanceMinor: number;
  outstandingInvoiceCount: number;
  /** Patient due on PENDING invoices whose due date has passed. */
  overdueAmountMinor: number;
  overdueInvoiceCount: number;
  /** Receipts in the current calendar month. */
  paymentsThisMonthMinor: number;
  paymentsThisMonthCount: number;
  /**
   * Collected over billed (patient due), to date. Null when nothing has been billed.
   * Capped at 100 so overpayments or credits never report above full collection.
   */
  collectionRatePercent: number | null;
  /** This month's collection ratio minus last month's, in points; null when incomputable. */
  collectionRateDeltaPercent: number | null;
}

/** One point on the six month revenue trend (receipts per month). */
export interface BillingRevenuePointResult {
  label: string;
  monthStart: string;
  totalMinor: number;
}

/** Aging of the outstanding (patient due) balance, bucketed by invoice age. */
export interface OutstandingAgingResult {
  days0to30Minor: number;
  days31to60Minor: number;
  days61to90Minor: number;
  days90PlusMinor: number;
}

/** One row in the Recent Payments table. */
export interface RecentPaymentResult {
  /** Human friendly transaction number, TXN-<sequence>. */
  reference: string;
  /** The paying account (the care recipient the payment was recorded against). */
  account: string;
  amountMinor: number;
  methodLabel: string | null;
  receivedAt: string;
}

/**
 * The activity types the billing tables can evidence honestly. Reminder Sent is in
 * the mockup but is deliberately omitted: no reminder or notification is modelled
 * yet, so it would be an invented event.
 */
export type BillingActivityType = 'PAYMENT_RECEIVED' | 'INVOICE_CREATED' | 'INVOICE_OVERDUE';

/**
 * One entry in the Recent Billing Activity feed. Structured, not pre formatted: the
 * client composes the sentence with its own money formatting (two currencies live
 * here, so the server never bakes a currency symbol into a string).
 */
export interface BillingActivityResult {
  type: BillingActivityType;
  /** A fixed label per type ("Payment Received", "Invoice Created", "Invoice Overdue"). */
  title: string;
  at: string;
  account: string;
  /** Present for invoice events, the INV-<year>-<sequence> number. */
  invoiceNumber: string | null;
  /** Present for PAYMENT_RECEIVED. */
  amountMinor: number | null;
  /** Present for INVOICE_OVERDUE. */
  daysPastDue: number | null;
}

export interface BillingDashboardResult {
  currency: string;
  generatedAt: string;
  kpis: BillingDashboardKpisResult;
  revenueSeries: BillingRevenuePointResult[];
  outstandingAging: OutstandingAgingResult;
  recentPayments: RecentPaymentResult[];
  recentActivity: BillingActivityResult[];
}
