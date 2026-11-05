import { InvoiceNoteCategory } from '../../domain/invoice-note-category.enum';

/** One internal note on the invoice Notes tab, with its author resolved. */
export interface InvoiceNoteView {
  id: string;
  category: InvoiceNoteCategory;
  body: string;
  createdAt: Date;
  authorName: string;
  authorRole: string;
  authorPhotoKey: string | null;
}

/** Read model for the invoice Notes tab. */
export interface BillingInvoiceNotesReadModel {
  /** The invoice's notes, newest first, or null when the invoice is unknown. */
  list(invoiceId: string): Promise<InvoiceNoteView[] | null>;
}

export const BILLING_INVOICE_NOTES_READ_MODEL = Symbol('BILLING_INVOICE_NOTES_READ_MODEL');
