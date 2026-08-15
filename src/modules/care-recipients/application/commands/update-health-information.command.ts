/** Command to record health and medication information (third wizard step). */
export interface UpdateHealthInformationCommand {
  ownerId: string;
  careRecipientId: string;
  medicalConditions?: string[];
  allergies?: string[];
  needsMedicationHelp: boolean;
  medications?: string[];
}
