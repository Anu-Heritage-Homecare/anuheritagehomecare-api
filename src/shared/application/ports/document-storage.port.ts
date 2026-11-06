/**
 * Abstraction over the object store that holds account documents (PDFs and the
 * like). Mirrors PhotoStorage but for raw, non image files: the adapter signs a
 * direct client upload so the file never passes through the API, and signs a
 * delivery URL so a stored key can be viewed or downloaded. Consumers depend on
 * this port, not the provider.
 */

/** Everything a client needs to upload one document straight to the store. */
export interface DocumentUploadTicket {
  /** Where the client POSTs the multipart form. */
  uploadUrl: string;
  /** Form fields to send alongside the file (signature, api key, timestamp...). */
  fields: Record<string, string>;
  /** The opaque key to persist on the document once the upload succeeds. */
  key: string;
}

export interface DocumentStorage {
  /**
   * Issue a signed ticket for a direct client upload. `reference` uniquely
   * identifies the document; the adapter namespaces it under its configured
   * folder to form the stored key. Fails closed if not configured.
   */
  createUploadTicket(params: { reference: string; now: Date }): DocumentUploadTicket;

  /**
   * A delivery URL for a stored key that a client can render or download, or an
   * empty string when the store is not configured.
   */
  urlFor(key: string): string;
}

export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');
