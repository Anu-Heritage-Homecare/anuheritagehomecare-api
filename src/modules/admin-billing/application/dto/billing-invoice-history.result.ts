import { InvoiceHistoryEventType } from '../ports/billing-invoices-read.port';

/** One entry on the invoice History tab. Money is minor units, date is an ISO string. */
export interface InvoiceHistoryEventResult {
  type: InvoiceHistoryEventType;
  title: string;
  at: string;
  amountMinor: number | null;
  methodLabel: string | null;
  performedBy: string | null;
}

export interface InvoiceHistoryResult {
  events: InvoiceHistoryEventResult[];
  total: number;
}
