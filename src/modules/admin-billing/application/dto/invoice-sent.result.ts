/** Outcome of emailing an invoice to the client (Create Invoice wizard, step 6). */
export interface InvoiceSentResult {
  invoiceNumber: string;
  /** The client address the invoice was sent to, masked for the admin response. */
  sentTo: string;
  sentAt: string;
}
