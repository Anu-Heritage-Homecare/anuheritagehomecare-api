/**
 * The Billing Account detail (Overview tab). Money is minor units in the account's
 * own currency.
 */

export interface BillingAccountSummaryResult {
  /** Human friendly account id, CP-<sequence>. */
  reference: string;
  createdDate: string;
  branch: string | null;
  /** Office set billing terms; populated once Edit Account captures them. */
  paymentTerms: string | null;
  preferredMethod: string | null;
}

export interface BillingAccountFinancialResult {
  currency: string | null;
  outstandingMinor: number;
  totalBilledMinor: number;
  totalPaidMinor: number;
  lastPaymentAt: string | null;
}

export interface BillingAccountInvoiceResult {
  number: string;
  amountMinor: number;
  dueDate: string | null;
  status: string;
}

export interface BillingAccountEventResult {
  type: string;
  /** A fixed label per type ("Payment Recorded", "Invoice Issued", ...). */
  title: string;
  at: string;
  amountMinor: number | null;
  methodLabel: string | null;
  invoiceNumber: string | null;
  recipientName: string | null;
  /** A short description for care plan, account edit and reminder events. */
  detail: string | null;
  /** The admin who performed it, when known. */
  actorName: string | null;
}

export interface BillingAccountDetailResult {
  id: string;
  accountName: string;
  primaryContact: string;
  email: string | null;
  phone: string | null;
  status: string;
  summary: BillingAccountSummaryResult;
  financial: BillingAccountFinancialResult;
  recentInvoices: BillingAccountInvoiceResult[];
  timeline: BillingAccountEventResult[];
}

/** The canonical account reference, ACC-<year>-<sequence>, used across billing. */
export function formatAccountReference(createdAt: Date, sequence: number): string {
  return `ACC-${createdAt.getUTCFullYear()}-${String(sequence).padStart(4, '0')}`;
}
