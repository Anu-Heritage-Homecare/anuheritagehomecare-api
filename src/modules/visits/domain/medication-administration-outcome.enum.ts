/**
 * What a caregiver did with a scheduled medication during a visit. Either it was
 * administered, or it was not, with the reason recorded (the "Choose Option"
 * sheet in the app: patient refused, out of stock, patient asleep).
 */
export enum MedicationAdministrationOutcome {
  Administered = 'ADMINISTERED',
  Refused = 'REFUSED',
  OutOfStock = 'OUT_OF_STOCK',
  PatientAsleep = 'PATIENT_ASLEEP',
}

/** Every valid outcome, used to validate incoming values at the boundary. */
export const ALL_MEDICATION_ADMINISTRATION_OUTCOMES: readonly MedicationAdministrationOutcome[] =
  Object.values(MedicationAdministrationOutcome);
