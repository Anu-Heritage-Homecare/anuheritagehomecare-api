/** The status vocabulary of the org wide Invoices list. */
export type InvoiceListStatus =
  | 'DRAFT'
  | 'AWAITING_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'CANCELLED'
  | 'WRITTEN_OFF';

/** Filters and paging for the org wide Invoices list. */
export interface InvoiceListFilter {
  /** null is the All tab. */
  status: InvoiceListStatus | null;
  search: string | null;
  billingAccountId: string | null;
  /** Inclusive due date window; null ends are open. */
  dueFrom: Date | null;
  dueTo: Date | null;
  /** Inclusive patient due window in minor units; null ends are open. */
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  page: number;
  pageSize: number;
}

/** One row of the org wide Invoices table. */
export interface InvoiceListRowView {
  id: string;
  sequence: number;
  issuedAt: Date;
  /** The billing account the invoice belongs to, null when none is linked. */
  billingAccountId: string | null;
  billingAccountName: string | null;
  careRecipientName: string;
  /** Patient due on the invoice, in minor units. */
  amountMinor: number;
  currency: string;
  dueDate: Date | null;
  status: InvoiceListStatus;
}

export interface InvoiceListCounts {
  all: number;
  draft: number;
  awaitingPayment: number;
  partiallyPaid: number;
  overdue: number;
  paid: number;
  cancelled: number;
  writtenOff: number;
}

export interface InvoiceListView {
  rows: InvoiceListRowView[];
  total: number;
  counts: InvoiceListCounts;
}

/** One line item on an invoice. Quantity, unit and rate are not stored on the line. */
export interface BillingInvoiceLineView {
  serviceName: string;
  amountMinor: number;
  quantity: number | null;
  unit: string | null;
  rateMinor: number | null;
}

/** The single invoice detail (the Overview tab). */
export interface BillingInvoiceDetailView {
  id: string;
  sequence: number;
  issuedAt: Date;
  dueDate: Date | null;
  periodStart: Date;
  periodEnd: Date;
  status: InvoiceListStatus;
  billingAccountId: string | null;
  billingAccountName: string | null;
  /** The bill to address, from the owner's stored address, null when unknown. */
  billingAddress: string | null;
  careRecipientName: string;
  careRecipientPhotoKey: string | null;
  currency: string;
  /** Gross invoice total (net of discounts and including tax), in minor units. */
  totalAmountMinor: number;
  insuranceCoveredMinor: number;
  /** The line totals before discounts and tax, plus the discount and tax amounts. */
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  taxRateBasisPoints: number;
  amountPaidMinor: number;
  lineItems: BillingInvoiceLineView[];
}

/**
 * One service line on the invoice Services tab. Only the service name and amount are
 * stored; category, hours/units, rate and assigned caregiver are not captured on a line.
 */
export interface BillingInvoiceServiceView {
  serviceName: string;
  category: string | null;
  hoursUnits: number | null;
  unit: string | null;
  rateMinor: number | null;
  amountMinor: number;
  serviceDateStart: Date | null;
  serviceDateEnd: Date | null;
  assignedCaregiver: string | null;
}

/** The invoice Services tab. The service period is invoice level, shared by every row. */
export interface BillingInvoiceServicesView {
  currency: string;
  servicePeriodStart: Date;
  servicePeriodEnd: Date;
  services: BillingInvoiceServiceView[];
}

/** One payment recorded against an invoice (the invoice Payments tab). */
export interface InvoicePaymentRowView {
  id: string;
  sequence: number;
  amountMinor: number;
  currency: string;
  methodLabel: string | null;
  receivedAt: Date;
}

/** The evidenced invoice lifecycle events (the History tab). */
export type InvoiceHistoryEventType =
  | 'INVOICE_CREATED'
  | 'INVOICE_APPROVED'
  | 'INVOICE_SENT'
  | 'INVOICE_VIEWED'
  | 'INVOICE_REMINDER_SENT'
  | 'INVOICE_CANCELLED'
  | 'INVOICE_WRITTEN_OFF'
  | 'PAYMENT_RECORDED';

/** One entry in the invoice lifecycle timeline. */
export interface InvoiceHistoryEventView {
  type: InvoiceHistoryEventType;
  at: Date;
  /** PAYMENT_RECORDED: amount paid and the method. */
  amountMinor: number | null;
  methodLabel: string | null;
  /** A short description for the logged lifecycle events. */
  detail: string | null;
  /** Who performed it (resolved name), null for the derived events without an actor. */
  performedBy: string | null;
}

/** Read model for the org wide Invoices list across every account. */
export interface BillingInvoicesReadModel {
  list(filter: InvoiceListFilter, now: Date): Promise<InvoiceListView>;
  /** One invoice with its lines and payment summary, or null when unknown. */
  detail(id: string, now: Date): Promise<BillingInvoiceDetailView | null>;
  /** The invoice's service lines (the Services tab), or null when unknown. */
  services(id: string): Promise<BillingInvoiceServicesView | null>;
  /** Payments recorded against the invoice, newest first, or null when unknown. */
  payments(id: string): Promise<InvoicePaymentRowView[] | null>;
  /** The evidenced invoice lifecycle timeline, newest first, or null when unknown. */
  history(id: string): Promise<InvoiceHistoryEventView[] | null>;
}

export const BILLING_INVOICES_READ_MODEL = Symbol('BILLING_INVOICES_READ_MODEL');
