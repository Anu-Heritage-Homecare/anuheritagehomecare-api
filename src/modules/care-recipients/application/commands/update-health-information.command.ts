/** One medication on the schedule, as supplied by the family in the health step. */
export interface MedicationInput {
  name: string;
  dose?: string | null;
  scheduleMinute?: number | null;
}

/** Command to record health information and the medication schedule (third step). */
export interface UpdateHealthInformationCommand {
  ownerId: string;
  careRecipientId: string;
  medicalConditions?: string[];
  allergies?: string[];
  needsMedicationHelp: boolean;
  medications?: MedicationInput[];
}
