/**
 * Lifecycle of an SOS alert. An alert is ACTIVE when raised, RESOLVED when the
 * office closes out the emergency, and CANCELLED if the caregiver cancels it (for
 * example a false alarm). Both terminal states keep the record; it is never
 * deleted, so the audit trail stays intact.
 */
export enum SosAlertStatus {
  Active = 'ACTIVE',
  Resolved = 'RESOLVED',
  Cancelled = 'CANCELLED',
}
