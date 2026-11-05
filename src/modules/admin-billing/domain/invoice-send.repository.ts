import { Currency } from '@shared/domain/currency.enum';

/** What the Send Invoice action needs to address and compose the client email. */
export interface InvoiceSendTarget {
  invoiceId: string;
  sequence: number;
  issuedAt: Date;
  amountMinor: number;
  currency: Currency;
  dueDate: Date | null;
  accountName: string | null;
  /** The billing client (the family owner) the invoice is sent to. */
  clientName: string;
  clientEmail: string | null;
}

/** Persistence port for sending a raised invoice to the client (wizard step 6). */
export interface InvoiceSendRepository {
  loadForSend(invoiceId: string): Promise<InvoiceSendTarget | null>;
  markSent(invoiceId: string, sentAt: Date): Promise<void>;
}

export const INVOICE_SEND_REPOSITORY = Symbol('INVOICE_SEND_REPOSITORY');
