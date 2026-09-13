import { MedicationWarning } from './medication-warning.entity';

/**
 * Persistence port for a recipient's medication clinical warnings. Captured as a
 * set, so the write replaces them wholesale; reads return them ordered.
 */
export interface MedicationWarningRepository {
  replaceForRecipient(careRecipientId: string, warnings: MedicationWarning[]): Promise<void>;
  listForRecipient(careRecipientId: string): Promise<MedicationWarning[]>;
}

export const MEDICATION_WARNING_REPOSITORY = Symbol('MEDICATION_WARNING_REPOSITORY');
