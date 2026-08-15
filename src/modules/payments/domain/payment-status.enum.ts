/** Lifecycle of a payment. The provider is the source of truth for the outcome. */
export enum PaymentStatus {
  Pending = 'PENDING',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
}
