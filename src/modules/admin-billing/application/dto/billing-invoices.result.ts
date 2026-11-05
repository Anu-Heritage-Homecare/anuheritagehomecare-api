import { InvoiceListCounts, InvoiceListStatus } from '../ports/billing-invoices-read.port';

/** One row of the org wide Invoices list. Money is minor units, dates are ISO strings. */
export interface BillingInvoiceRowResult {
  id: string;
  number: string;
  billingAccountId: string | null;
  billingAccountName: string | null;
  careRecipientName: string;
  amountMinor: number;
  currency: string;
  dueDate: string | null;
  status: InvoiceListStatus;
}

export interface BillingInvoicesListResult {
  invoices: BillingInvoiceRowResult[];
  tabs: InvoiceListCounts;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
