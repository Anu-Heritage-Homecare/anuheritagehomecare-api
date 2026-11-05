import { BillingAccountEventType } from '../ports/billing-accounts-read.port';

/** One entry on the Activity tab. Money is minor units, dates are ISO strings. */
export interface BillingAccountActivityEventResult {
  type: BillingAccountEventType;
  title: string;
  at: string;
  amountMinor: number | null;
  methodLabel: string | null;
  invoiceNumber: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  recipientName: string | null;
  performedBy: string | null;
}

export interface BillingAccountActivityResult {
  currency: string | null;
  events: BillingAccountActivityEventResult[];
  total: number;
}
