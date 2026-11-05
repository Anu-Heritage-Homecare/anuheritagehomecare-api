import { InvoiceNote } from './invoice-note.entity';

/**
 * Persistence port for the InvoiceNote aggregate. Declared in the domain; infrastructure
 * supplies the Prisma adapter.
 */
export interface InvoiceNoteRepository {
  save(note: InvoiceNote): Promise<void>;
  /** Whether the parent invoice exists, so a note is never orphaned. */
  invoiceExists(invoiceId: string): Promise<boolean>;
}

export const INVOICE_NOTE_REPOSITORY = Symbol('INVOICE_NOTE_REPOSITORY');
