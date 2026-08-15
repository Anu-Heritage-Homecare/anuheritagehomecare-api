/** Outcome of an identity verification. The provider is the source of truth. */
export enum KycStatus {
  Pending = 'PENDING',
  Verified = 'VERIFIED',
  Failed = 'FAILED',
}
