/**
 * Abstraction over the object store that holds visit photos. The concrete
 * adapter (Cloudinary) signs a direct client upload so the file never passes
 * through the API, and signs a delivery URL so a stored key can be viewed or
 * downloaded. Consumers depend on this port, not the provider.
 */

/** Everything a client needs to upload one photo straight to the store. */
export interface PhotoUploadTicket {
  /** Where the client POSTs the multipart form. */
  uploadUrl: string;
  /** Form fields to send alongside the file (signature, api key, timestamp...). */
  fields: Record<string, string>;
  /** The opaque key to persist on the visit once the upload succeeds. */
  key: string;
}

export interface PhotoStorage {
  /**
   * Issue a signed ticket for a direct client upload. `reference` uniquely
   * identifies the photo within its visit; the adapter namespaces it under its
   * configured folder to form the stored key. Fails closed if not configured.
   */
  createUploadTicket(params: { reference: string; now: Date }): PhotoUploadTicket;

  /**
   * A delivery URL for a stored key that a client can render or download, or an
   * empty string when the store is not configured.
   */
  urlFor(key: string): string;

  /**
   * Fetch the raw bytes of a stored key, for a server side download (for example
   * bundling a visit's photos into a single archive). Fails closed if the store
   * is not configured or the object cannot be retrieved.
   */
  download(key: string): Promise<Buffer>;
}

export const PHOTO_STORAGE = Symbol('PHOTO_STORAGE');
