/**
 * Lifecycle status of a user account. A freshly registered account is
 * PendingVerification until its email is verified, at which point it becomes
 * Active. Suspended blocks access without deleting the account.
 */
export enum UserStatus {
  PendingVerification = 'PENDING_VERIFICATION',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
}
