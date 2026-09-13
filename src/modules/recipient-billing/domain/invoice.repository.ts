import { Invoice } from './invoice.entity';

/**
 * Persistence port for invoices (write side). The paginated reads and the
 * aggregate figures for the admin billing screen live in a dedicated read model.
 */
export interface InvoiceRepository {
  add(invoice: Invoice): Promise<void>;
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
}

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
