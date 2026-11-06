import { InvoiceAttachment } from './invoice-attachment.entity';

export interface InvoiceAttachmentRepository {
  add(attachment: InvoiceAttachment): Promise<void>;
  /** The invoice's attachments, newest first. */
  listByInvoice(invoiceId: string): Promise<InvoiceAttachment[]>;
  findById(id: string): Promise<InvoiceAttachment | null>;
  remove(id: string): Promise<void>;
  /** Whether the parent invoice exists, for a clean not found before writing. */
  invoiceExists(invoiceId: string): Promise<boolean>;
}

export const INVOICE_ATTACHMENT_REPOSITORY = Symbol('INVOICE_ATTACHMENT_REPOSITORY');
