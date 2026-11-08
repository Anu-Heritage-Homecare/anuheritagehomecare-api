/** The outcome of attempting to delete a draft (unsent) invoice. */
export type DeleteDraftInvoiceOutcome =
  'OK' | 'NOT_FOUND' | 'NOT_PENDING' | 'SENT' | 'HAS_PAYMENTS';

/**
 * Persistence port for hard deleting a draft invoice. Only a PENDING invoice that has
 * never been sent and has no recorded payments can be deleted; the guard is atomic.
 */
export interface InvoiceDeleteRepository {
  deleteIfDraft(invoiceId: string): Promise<DeleteDraftInvoiceOutcome>;
}

export const INVOICE_DELETE_REPOSITORY = Symbol('INVOICE_DELETE_REPOSITORY');
