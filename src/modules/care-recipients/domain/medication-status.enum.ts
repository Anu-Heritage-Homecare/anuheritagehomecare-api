/**
 * Whether a prescribed medication is current. An admin discontinues a medication
 * rather than deleting it, so the prescription history and adherence record are
 * preserved. Onboarding always creates an ACTIVE entry.
 */
export enum MedicationStatus {
  Active = 'ACTIVE',
  Discontinued = 'DISCONTINUED',
}

/** Every valid status, used to validate incoming values at the boundary. */
export const ALL_MEDICATION_STATUSES: readonly MedicationStatus[] = Object.values(MedicationStatus);
