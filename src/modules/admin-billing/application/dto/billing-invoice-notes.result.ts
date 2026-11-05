import { InvoiceNoteCategory } from '../../domain/invoice-note-category.enum';

/** One internal note on the invoice Notes tab. Date is an ISO string. */
export interface InvoiceNoteResult {
  id: string;
  category: InvoiceNoteCategory;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  authorPhotoKey: string | null;
}

export interface InvoiceNotesResult {
  notes: InvoiceNoteResult[];
  total: number;
}

export interface InvoiceNoteCreatedResult {
  id: string;
  createdAt: string;
}
