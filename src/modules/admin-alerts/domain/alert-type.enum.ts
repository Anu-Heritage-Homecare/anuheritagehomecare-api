/**
 * The kind of operational problem an alert flags. Drives the icon and the action
 * a coordinator takes (reassign, contact, notify, review). Declared in the domain
 * layer so it is independent of the Prisma generated enum.
 */
export enum AlertType {
  LateCaregiver = 'LATE_CAREGIVER',
  MissedClockIn = 'MISSED_CLOCK_IN',
  CertificationExpiring = 'CERTIFICATION_EXPIRING',
  MedicationIssue = 'MEDICATION_ISSUE',
  General = 'GENERAL',
}
