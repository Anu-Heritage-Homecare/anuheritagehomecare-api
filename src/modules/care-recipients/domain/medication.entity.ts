import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';

interface MedicationProps {
  name: string;
  dose: string | null;
  scheduleMinute: number | null;
}

const MAX_NAME_LENGTH = 200;
const MAX_DOSE_LENGTH = 60;
const MINUTES_IN_DAY = 24 * 60;

/**
 * One prescribed medication on a care recipient's schedule (for example
 * "Metformin", "500 mg", 8:30 AM). A child entity of the CareRecipient aggregate
 * with its own identity, so a caregiver can record administration against a
 * specific entry during a visit. `scheduleMinute` is minutes from midnight, kept
 * timezone free; `dose` and the time are optional because a family may not know
 * them. This is sensitive personal data and must never be logged.
 */
export class Medication extends Entity<string> {
  private readonly props: MedicationProps;

  private constructor(id: string, props: MedicationProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    dose?: string | null;
    scheduleMinute?: number | null;
  }): Medication {
    const name = params.name.trim();
    if (name.length === 0) {
      throw new ValidationException('A medication must have a name');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A medication name exceeds the maximum length');
    }

    const dose = Medication.cleanDose(params.dose);
    const scheduleMinute = Medication.cleanScheduleMinute(params.scheduleMinute);

    return new Medication(params.id, { name, dose, scheduleMinute });
  }

  private static cleanDose(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const dose = raw.trim();
    if (dose.length === 0) {
      return null;
    }
    if (dose.length > MAX_DOSE_LENGTH) {
      throw new ValidationException('A medication dose exceeds the maximum length');
    }
    return dose;
  }

  private static cleanScheduleMinute(raw: number | null | undefined): number | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    if (!Number.isInteger(raw) || raw < 0 || raw >= MINUTES_IN_DAY) {
      throw new ValidationException('A medication time must be a minute within the day');
    }
    return raw;
  }

  public get name(): string {
    return this.props.name;
  }

  public get dose(): string | null {
    return this.props.dose;
  }

  public get scheduleMinute(): number | null {
    return this.props.scheduleMinute;
  }
}
