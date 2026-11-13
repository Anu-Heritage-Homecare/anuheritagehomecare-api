import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';

export type BillingAccountTab = 'ALL' | 'OUTSTANDING' | 'INACTIVE';
export type AccountBillingStatus = 'CURRENT' | 'PENDING' | 'OVERDUE' | 'NONE';

/** Filters and paging for the Billing Accounts list. */
export interface BillingAccountsFilter {
  tab: BillingAccountTab;
  search: string | null;
  branch: string | null;
  status: PrismaFamilyStatus | null;
  /** Inclusive outstanding balance window in minor units; null ends are open. */
  minBalanceMinor: number | null;
  maxBalanceMinor: number | null;
  page: number;
  pageSize: number;
}

/** One row of the Billing Accounts table (composed from the family directory). */
export interface BillingAccountRowView {
  id: string;
  sequence: number;
  createdAt: Date;
  /** The billing account label (falls back to the contact name when unset). */
  accountName: string;
  /** The primary contact person (the linked user's name, or the captured name). */
  primaryContact: string;
  phone: string | null;
  branch: string | null;
  recipientCount: number;
  outstandingMinor: number;
  currency: string | null;
  lastPaymentAt: Date | null;
  status: PrismaFamilyStatus;
  billingStatus: AccountBillingStatus;
}

export interface BillingAccountsView {
  rows: BillingAccountRowView[];
  total: number;
  counts: { all: number; outstanding: number; inactive: number };
  branches: string[];
}

/** One invoice in the account's Recent Invoices panel. */
export interface BillingAccountInvoiceView {
  sequence: number;
  issuedAt: Date;
  /** Patient due on the invoice, in minor units. */
  amountMinor: number;
  dueDate: Date | null;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'WRITTEN_OFF';
}

export type BillingAccountEventType =
  | 'PAYMENT_RECORDED'
  | 'INVOICE_ISSUED'
  | 'CARE_RECIPIENT_LINKED'
  | 'CARE_PLAN_UPDATED'
  | 'ACCOUNT_DETAILS_EDITED'
  | 'REMINDER_SENT';

/** One entry in the account Activity Timeline. */
export interface BillingAccountEventView {
  type: BillingAccountEventType;
  at: Date;
  /** PAYMENT_RECORDED. */
  amountMinor: number | null;
  methodLabel: string | null;
  /** INVOICE_ISSUED. */
  invoiceSequence: number | null;
  invoiceIssuedAt: Date | null;
  /** CARE_RECIPIENT_LINKED. */
  recipientName: string | null;
  /** CARE_PLAN_UPDATED, ACCOUNT_DETAILS_EDITED, REMINDER_SENT: a short description. */
  detail: string | null;
  /** The admin who performed it (resolved name), when known. */
  actorName: string | null;
}

/** The whole Billing Account detail (the Overview tab). */
export interface BillingAccountDetailView {
  id: string;
  sequence: number;
  accountName: string;
  primaryContact: string;
  email: string | null;
  phone: string | null;
  branch: string | null;
  status: PrismaFamilyStatus;
  createdAt: Date;
  currency: string | null;
  /** The office's default payment terms in days (global setting), null if unset. */
  paymentTermsDays: number | null;
  /** The office set preferred settlement method for this account, null if unset. */
  preferredPaymentMethod: string | null;
  outstandingMinor: number;
  totalBilledMinor: number;
  totalPaidMinor: number;
  lastPaymentAt: Date | null;
  recentInvoices: BillingAccountInvoiceView[];
  timeline: BillingAccountEventView[];
}

/** The display status of an invoice on the Invoices tab. */
export type InvoiceDisplayStatus =
  'PAID' | 'AWAITING_PAYMENT' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';

/** One invoice row on the account Invoices tab (the full list, not just recent). */
export interface BillingAccountInvoiceRowView {
  id: string;
  sequence: number;
  issuedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  /** Patient due on the invoice, in minor units. */
  amountMinor: number;
  dueDate: Date | null;
  /** Payments recorded against this invoice, in minor units. */
  paidAmountMinor: number;
  currency: string;
  status: InvoiceDisplayStatus;
}

/** One entry in the account Activity tab (a fuller, uncapped timeline). */
export interface BillingAccountActivityEventView {
  type: BillingAccountEventType;
  at: Date;
  /** PAYMENT_RECORDED: amount paid. INVOICE_ISSUED: patient due. Minor units. */
  amountMinor: number | null;
  methodLabel: string | null;
  /** The invoice this event concerns (issued, or settled by a payment). */
  invoiceSequence: number | null;
  invoiceIssuedAt: Date | null;
  /** INVOICE_ISSUED: the care cycle the invoice covers. */
  periodStart: Date | null;
  periodEnd: Date | null;
  recipientName: string | null;
  /** CARE_PLAN_UPDATED, ACCOUNT_DETAILS_EDITED, REMINDER_SENT: a short description. */
  detail: string | null;
  /** Who performed it; null until an actor is captured on these records. */
  performedBy: string | null;
}

export interface BillingAccountActivityView {
  currency: string | null;
  events: BillingAccountActivityEventView[];
}

/** One recorded payment on the account Payments tab. */
export interface BillingAccountPaymentRowView {
  id: string;
  sequence: number;
  /** The invoice the payment was recorded against, null when unlinked. */
  invoiceSequence: number | null;
  invoiceIssuedAt: Date | null;
  amountMinor: number;
  currency: string;
  methodLabel: string | null;
  receivedAt: Date;
  referenceNumber: string | null;
  bankName: string | null;
  notes: string | null;
}

/** One care recipient billed under an account (the Care Recipients tab). */
export interface BillingAccountRecipientView {
  id: string;
  name: string;
  photoKey: string | null;
  relationship: string;
  /** The current subscription's plan name, null when the recipient has no plan. */
  servicePlan: string | null;
  monthlyCostMinor: number | null;
  currency: string | null;
  startDate: Date | null;
  /** The subscription status when a plan exists, otherwise the recipient status. */
  status: string;
}

/**
 * Read model for the Billing Accounts list: the family directory entries composed
 * with their linked care recipients, outstanding balance and last recorded payment.
 */
export interface BillingAccountsReadModel {
  list(filter: BillingAccountsFilter, now: Date): Promise<BillingAccountsView>;
  detail(id: string): Promise<BillingAccountDetailView | null>;
  /** The recipients billed under an account, or null when the account is unknown. */
  careRecipients(id: string): Promise<BillingAccountRecipientView[] | null>;
  /** Every invoice billed to an account, newest first, or null when unknown. */
  invoices(id: string, now: Date): Promise<BillingAccountInvoiceRowView[] | null>;
  /** Every recorded payment on an account, newest first, or null when unknown. */
  payments(id: string): Promise<BillingAccountPaymentRowView[] | null>;
  /** The full account activity timeline, newest first, or null when unknown. */
  activity(id: string): Promise<BillingAccountActivityView | null>;
}

export const BILLING_ACCOUNTS_READ_MODEL = Symbol('BILLING_ACCOUNTS_READ_MODEL');
