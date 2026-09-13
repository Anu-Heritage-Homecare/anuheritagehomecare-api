/**
 * The review status of a recipient document. CURRENT is the default, PENDING_REVIEW
 * awaits an office check, and VERIFIED has been confirmed. Expiry ("Expiring Soon")
 * is derived from the document's expiry date, not stored as a status.
 */
export enum DocumentStatus {
  Current = 'CURRENT',
  PendingReview = 'PENDING_REVIEW',
  Verified = 'VERIFIED',
}

/** Every valid status, used to validate incoming values at the boundary. */
export const ALL_DOCUMENT_STATUSES: readonly DocumentStatus[] = Object.values(DocumentStatus);
