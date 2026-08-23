import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { MedicationAdministrationOutcome } from '../medication-administration-outcome.enum';

interface MedicationAdministrationProps {
  medicationId: string;
  outcome: MedicationAdministrationOutcome;
  note: string | null;
  recordedAt: Date;
}

const MAX_NOTE_LENGTH = 500;

/**
 * A caregiver's record of what happened with one scheduled medication during a
 * visit. `medicationId` points at a Medication in the care recipients context by
 * id only. A free text note (for example why the patient refused) is optional and
 * is sensitive, so it must never be logged. `recordedAt` is stamped server side.
 */
export class MedicationAdministration extends ValueObject<MedicationAdministrationProps> {
  private constructor(props: MedicationAdministrationProps) {
    super(props);
  }

  public static create(params: {
    medicationId: string;
    outcome: MedicationAdministrationOutcome;
    note?: string | null;
    recordedAt: Date;
  }): MedicationAdministration {
    if (Number.isNaN(params.recordedAt.getTime())) {
      throw new ValidationException('The time a medication was recorded is not valid');
    }

    const note = MedicationAdministration.cleanNote(params.note);

    return new MedicationAdministration({
      medicationId: params.medicationId,
      outcome: params.outcome,
      note,
      recordedAt: params.recordedAt,
    });
  }

  private static cleanNote(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const note = raw.trim();
    if (note.length === 0) {
      return null;
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ValidationException('A medication note exceeds the maximum length');
    }
    return note;
  }

  public get medicationId(): string {
    return this.props.medicationId;
  }

  public get outcome(): MedicationAdministrationOutcome {
    return this.props.outcome;
  }

  public get note(): string | null {
    return this.props.note;
  }

  public get recordedAt(): Date {
    return this.props.recordedAt;
  }
}
