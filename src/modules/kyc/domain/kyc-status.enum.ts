/**
 * Outcome of an identity verification.
 *
 * PENDING while an asynchronous provider (Stripe Identity) is still processing.
 * VERIFIED when the identity data matched and the face matched. REJECTED when the
 * provider verified a real identity but the owner's details or face did not match
 * it (the mismatch is stored for audit). FAILED when the provider could not
 * verify at all (document not found or unreadable).
 */
export enum KycStatus {
  Pending = 'PENDING',
  Verified = 'VERIFIED',
  Rejected = 'REJECTED',
  Failed = 'FAILED',
}
