import { InvoiceListStatus } from '../ports/billing-invoices-read.port';

/** One line item on the invoice. Quantity, unit and rate are not stored yet. */
export interface BillingInvoiceLineResult {
  serviceName: string;
  quantity: number | null;
  unit: string | null;
  rateMinor: number | null;
  amountMinor: number;
}

/** The single invoice detail (the Overview tab). Money is minor units, dates are ISO. */
export interface BillingInvoiceDetailResult {
  id: string;
  number: string;
  status: InvoiceListStatus;
  billingAccountId: string | null;
  billingAccountName: string | null;
  careRecipientName: string;
  careRecipientPhotoKey: string | null;
  invoiceDate: string;
  dueDate: string | null;
  /** Derived from the gap between the invoice date and the due date, e.g. "Net 30". */
  paymentTerms: string | null;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  currency: string;
  totalAmountMinor: number;
  insuranceCoveredMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
  percentPaid: number;
  lineItems: BillingInvoiceLineResult[];
}
