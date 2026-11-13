/** The outcome of attempting to write off an invoice. */
export type WriteOffInvoiceOutcome = 'OK' | 'NOT_FOUND' | 'NOT_OUTSTANDING';

/**
 * Persistence port for writing off (as uncollectable bad debt) an invoice. Only a PENDING
 * invoice carries an outstanding receivable to write off; the guard is atomic so a paid,
 * cancelled or already written off invoice is never touched.
 */
export interface InvoiceWriteOffRepository {
  writeOffIfOutstanding(invoiceId: string): Promise<WriteOffInvoiceOutcome>;
}

export const INVOICE_WRITEOFF_REPOSITORY = Symbol('INVOICE_WRITEOFF_REPOSITORY');
