/**
 * Previews the sequence the next issued invoice would take, so the Billing
 * Settings screen can show the Next Number. Read only; it never advances the
 * sequence (invoice creation owns that).
 */
export interface InvoiceNumberPreviewPort {
  nextSequence(): Promise<number>;
}

export const INVOICE_NUMBER_PREVIEW_PORT = Symbol('INVOICE_NUMBER_PREVIEW_PORT');
