import { InvoiceDisplayStatus } from '../ports/billing-accounts-read.port';

/** One invoice row on the Invoices tab. Money is minor units, dates are ISO strings. */
export interface BillingAccountInvoiceRowResult {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  amountMinor: number;
  currency: string;
  dueDate: string | null;
  paidAmountMinor: number;
  status: InvoiceDisplayStatus;
}

export interface BillingAccountInvoicesResult {
  invoices: BillingAccountInvoiceRowResult[];
  total: number;
}
