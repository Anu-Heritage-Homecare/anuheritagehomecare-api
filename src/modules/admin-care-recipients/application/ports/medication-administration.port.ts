import { MedicationAdministrationOutcome } from '@modules/visits/domain/medication-administration-outcome.enum';

/** Administered versus total recorded doses for one medication over a window. */
export interface MedicationAdherenceCount {
  administered: number;
  recorded: number;
}

/** One recorded administration, flattened with its visit's caregiver and date. */
export interface AdministrationView {
  medicationId: string;
  outcome: MedicationAdministrationOutcome;
  recordedAt: Date;
  caregiverId: string | null;
  visitDate: Date;
}

/**
 * Read port over the visits context's medication administration records, for the
 * admin Medications screen. Adherence is computed honestly from what was actually
 * recorded during visits (administered over total recorded), never a stored guess.
 */
export interface MedicationAdministrationDirectory {
  /** Administered and total recorded counts per medication id, over the window. */
  adherenceCounts(
    recipientId: string,
    from: Date,
    to: Date,
  ): Promise<Map<string, MedicationAdherenceCount>>;
  /** Recent administrations for the recipient since a date, most recent first. */
  recentAdministrations(
    recipientId: string,
    since: Date,
    limit: number,
  ): Promise<AdministrationView[]>;
}

export const MEDICATION_ADMINISTRATION_DIRECTORY = Symbol('MEDICATION_ADMINISTRATION_DIRECTORY');
