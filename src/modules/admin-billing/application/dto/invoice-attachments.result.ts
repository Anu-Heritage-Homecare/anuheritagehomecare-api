/** One row on the invoice Attachments tab. */
export interface InvoiceAttachmentResult {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  /** A signed delivery URL to view or download the file, empty if storage is off. */
  downloadUrl: string;
}

export interface InvoiceAttachmentsResult {
  attachments: InvoiceAttachmentResult[];
  total: number;
}
