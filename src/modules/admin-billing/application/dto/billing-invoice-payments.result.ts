import { PaymentDisplayStatus } from './billing-account-payments.result';

/** One payment on the invoice Payments tab. Money is minor units, date is an ISO string. */
export interface InvoicePaymentRowResult {
  id: string;
  reference: string;
  amountMinor: number;
  currency: string;
  method: string | null;
  receivedAt: string;
  status: PaymentDisplayStatus;
}

export interface InvoicePaymentsResult {
  payments: InvoicePaymentRowResult[];
  total: number;
}
