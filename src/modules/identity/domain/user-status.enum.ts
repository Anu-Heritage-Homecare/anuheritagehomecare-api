/**
 * Lifecycle status of a user account. A freshly registered account is
 * PendingVerification until its email is verified, at which point it becomes
 * Active. Suspended blocks access without deleting the account. Closed is a soft
 * account deletion: login is blocked and sessions are revoked, but the record and
 * its history are retained (reversible by support).
 */
export enum UserStatus {
  PendingVerification = 'PENDING_VERIFICATION',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
  Closed = 'CLOSED',
}
