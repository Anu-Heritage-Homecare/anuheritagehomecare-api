/**
 * Lifecycle of an SOS alert. An alert is ACTIVE when raised and CANCELLED if the
 * caregiver cancels it (for example a false alarm). Cancelling keeps the record;
 * it is never deleted, so the audit trail stays intact.
 */
export enum SosAlertStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
}
