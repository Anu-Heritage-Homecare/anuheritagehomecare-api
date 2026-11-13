import { Currency } from '@shared/domain/currency.enum';

/** Settle part of an invoice with an approved non cash credit (Apply Credit). */
export interface ApplyCreditCommand {
  adjustmentId: string;
  invoiceId: string;
  amountMinor: number;
  currency: Currency;
  now: Date;
}

/**
 * Applies and reverses a credit settlement against an invoice. The credit is stored as
 * a non cash payment row (tagged with the adjustment id) so it nets against the invoice
 * balance everywhere, while staying out of the cash collection and revenue reads.
 */
export interface InvoiceCreditWriter {
  applyCredit(command: ApplyCreditCommand): Promise<void>;
  /** Remove the credit settlement for an adjustment (on reversal); a no op when absent. */
  removeCredit(adjustmentId: string): Promise<void>;
}

export const INVOICE_CREDIT_WRITER = Symbol('INVOICE_CREDIT_WRITER');
