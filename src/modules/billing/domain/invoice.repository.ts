import { Invoice } from './invoice.entity';

/**
 * Persistence port for invoices. `save` upserts on the subscription and period
 * start, so re-issuing the same period overwrites rather than duplicates.
 */
export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  listForOwner(ownerId: string): Promise<Invoice[]>;
}

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
