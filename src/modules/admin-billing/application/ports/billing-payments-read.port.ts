/** The status vocabulary of the org wide Payments list. */
export type PaymentListStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

/** Filters and paging for the org wide Payments list. */
export interface PaymentListFilter {
  /** null is the All tab. */
  status: PaymentListStatus | null;
  search: string | null;
  billingAccountId: string | null;
  /** Exact method label to match (Bank Transfer, Card Payment, ...). */
  method: string | null;
  /** Inclusive received date window; null ends are open. */
  receivedFrom: Date | null;
  receivedTo: Date | null;
  /** Inclusive amount window in minor units; null ends are open. */
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  page: number;
  pageSize: number;
}

/** One row of the org wide Payments table. */
export interface PaymentListRowView {
  id: string;
  /** Human friendly reference (PAY-<year>-<n>), stable per payment. */
  reference: string;
  receivedAt: Date;
  /** The invoice the payment settled (INV-<year>-<n>), null when unlinked. */
  invoiceNumber: string | null;
  billingAccountId: string | null;
  billingAccountName: string | null;
  amountMinor: number;
  currency: string;
  methodLabel: string | null;
  status: PaymentListStatus;
}

export interface PaymentListCounts {
  all: number;
  pending: number;
  completed: number;
  failed: number;
  refunded: number;
}

export interface PaymentListView {
  rows: PaymentListRowView[];
  total: number;
  counts: PaymentListCounts;
  /** Distinct method labels present, for the Method filter dropdown. */
  methods: string[];
}

/** One event on a payment's history timeline (Payment Details drawer). */
export interface PaymentEventRowView {
  type: 'INITIATED' | 'CONFIRMED' | 'RECEIPT_GENERATED' | 'REFUNDED';
  at: Date;
  actorType: 'SYSTEM' | 'ADMIN';
  actorAdminId: string | null;
  actorLabel: string | null;
  detail: string | null;
}

/** The Payment Details drawer: one recorded payment, its linked invoice and history. */
export interface PaymentDetailView {
  id: string;
  sequence: number;
  receivedAt: Date;
  amountMinor: number;
  currency: string;
  methodLabel: string | null;
  referenceNumber: string | null;
  bankName: string | null;
  notes: string | null;
  refundedAt: Date | null;
  /** The settled invoice, null when the payment is unlinked. */
  invoiceSequence: number | null;
  invoiceIssuedAt: Date | null;
  invoiceAmountMinor: number | null;
  invoiceStatus: string | null;
  accountName: string | null;
  events: PaymentEventRowView[];
}

/** Read model for the org wide Payments list across every account. */
export interface BillingPaymentsReadModel {
  list(filter: PaymentListFilter): Promise<PaymentListView>;
  /** One recorded payment's full detail, or null when the id is unknown. */
  detail(paymentId: string): Promise<PaymentDetailView | null>;
}

export const BILLING_PAYMENTS_READ_MODEL = Symbol('BILLING_PAYMENTS_READ_MODEL');
