/** The outcome of attempting to cancel an invoice. */
export type CancelInvoiceOutcome = 'OK' | 'NOT_FOUND' | 'NOT_PENDING';

/**
 * Persistence port for cancelling (voiding) an invoice. Only a PENDING invoice can be
 * cancelled; the guard is atomic so a paid or already cancelled invoice is never voided.
 */
export interface InvoiceCancelRepository {
  cancelIfPending(invoiceId: string): Promise<CancelInvoiceOutcome>;
}

export const INVOICE_CANCEL_REPOSITORY = Symbol('INVOICE_CANCEL_REPOSITORY');
