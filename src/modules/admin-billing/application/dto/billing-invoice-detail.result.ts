import { InvoiceListStatus } from '../ports/billing-invoices-read.port';

/** One line item on the invoice; quantity, unit and rate are null on older invoices. */
export interface BillingInvoiceLineResult {
  serviceName: string;
  quantity: number | null;
  unit: string | null;
  rateMinor: number | null;
  amountMinor: number;
}

/** The issuing agency's profile, printed as the invoice letterhead and payment info. */
export interface BillingInvoiceIssuerResult {
  companyName: string | null;
  companyAddress: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
}

/** The single invoice detail (the Overview tab). Money is minor units, dates are ISO. */
export interface BillingInvoiceDetailResult {
  id: string;
  number: string;
  status: InvoiceListStatus;
  billingAccountId: string | null;
  billingAccountName: string | null;
  /** The bill to address, from the owner's stored address, null when unknown. */
  billingAddress: string | null;
  careRecipientName: string;
  careRecipientPhotoKey: string | null;
  invoiceDate: string;
  dueDate: string | null;
  /** Derived from the gap between the invoice date and the due date, e.g. "Net 30". */
  paymentTerms: string | null;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  currency: string;
  /** The line totals before discounts and tax. */
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  /** The tax rate applied, as whole percent (e.g. 7.5). */
  taxRatePercent: number;
  totalAmountMinor: number;
  insuranceCoveredMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
  percentPaid: number;
  lineItems: BillingInvoiceLineResult[];
  /** The issuing agency's profile from billing settings (letterhead and payment info). */
  issuer: BillingInvoiceIssuerResult;
}
