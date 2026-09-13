import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { MedicationStatus } from './medication-status.enum';

interface MedicationProps {
  name: string;
  dose: string | null;
  scheduleMinute: number | null;
  /** The clinical purpose of the prescription, office set. */
  purpose: string | null;
  /** The prescribing physician's name, office set free text. */
  prescribedBy: string | null;
  /** When the prescription started. */
  startDate: Date | null;
  /** Administration instructions, for example "with food". */
  instructions: string | null;
  /** Every time of day a dose is due, minutes from midnight, ordered. */
  doseTimes: number[];
  status: MedicationStatus;
  discontinuedAt: Date | null;
}

const MAX_NAME_LENGTH = 200;
const MAX_DOSE_LENGTH = 60;
const MAX_PURPOSE_LENGTH = 300;
const MAX_PRESCRIBER_LENGTH = 120;
const MAX_INSTRUCTIONS_LENGTH = 300;
const MAX_DOSE_TIMES = 12;
const MINUTES_IN_DAY = 24 * 60;

/**
 * One prescribed medication on a care recipient's schedule (for example
 * "Metformin", "500 mg", dosed 8:30 AM and 5:00 PM). A child entity of the
 * CareRecipient aggregate with its own identity, so a caregiver can record
 * administration against a specific entry during a visit and the admin can manage
 * it as a prescription. `scheduleMinute` and `doseTimes` are minutes from midnight,
 * kept timezone free. The family onboarding wizard captures only the name, dose and
 * a single time; the office adds the clinical fields (purpose, prescriber, start
 * date, instructions, the full dose schedule and the discontinue lifecycle). This
 * is sensitive personal data and must never be logged.
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
    purpose?: string | null;
    prescribedBy?: string | null;
    startDate?: Date | null;
    instructions?: string | null;
    doseTimes?: number[] | null;
    status?: MedicationStatus;
    discontinuedAt?: Date | null;
  }): Medication {
    const name = params.name.trim();
    if (name.length === 0) {
      throw new ValidationException('A medication must have a name');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A medication name exceeds the maximum length');
    }

    const doseTimes = Medication.cleanDoseTimes(params.doseTimes);
    const scheduleMinute =
      Medication.cleanScheduleMinute(params.scheduleMinute) ?? doseTimes[0] ?? null;

    return new Medication(params.id, {
      name,
      dose: Medication.cleanText(params.dose, MAX_DOSE_LENGTH, 'dose'),
      scheduleMinute,
      purpose: Medication.cleanText(params.purpose, MAX_PURPOSE_LENGTH, 'purpose'),
      prescribedBy: Medication.cleanText(params.prescribedBy, MAX_PRESCRIBER_LENGTH, 'prescriber'),
      startDate: params.startDate ?? null,
      instructions: Medication.cleanText(
        params.instructions,
        MAX_INSTRUCTIONS_LENGTH,
        'instructions',
      ),
      doseTimes,
      status: params.status ?? MedicationStatus.Active,
      discontinuedAt: params.discontinuedAt ?? null,
    });
  }

  /** A copy with the editable prescription fields replaced, preserving identity. */
  public withUpdates(params: {
    name: string;
    dose?: string | null;
    purpose?: string | null;
    prescribedBy?: string | null;
    startDate?: Date | null;
    instructions?: string | null;
    doseTimes?: number[] | null;
  }): Medication {
    return Medication.create({
      id: this.id,
      name: params.name,
      dose: params.dose,
      purpose: params.purpose,
      prescribedBy: params.prescribedBy,
      startDate: params.startDate,
      instructions: params.instructions,
      doseTimes: params.doseTimes,
      status: this.props.status,
      discontinuedAt: this.props.discontinuedAt,
    });
  }

  /** A discontinued copy, stamped at the given instant, preserving identity. */
  public discontinuedCopy(now: Date): Medication {
    if (this.props.status === MedicationStatus.Discontinued) {
      throw new ValidationException('The medication is already discontinued');
    }
    return new Medication(this.id, {
      ...this.props,
      doseTimes: [...this.props.doseTimes],
      status: MedicationStatus.Discontinued,
      discontinuedAt: now,
    });
  }

  private static cleanText(
    raw: string | null | undefined,
    max: number,
    label: string,
  ): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > max) {
      throw new ValidationException(`A medication ${label} exceeds the maximum length`);
    }
    return value;
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

  private static cleanDoseTimes(raw: number[] | null | undefined): number[] {
    if (raw === null || raw === undefined) {
      return [];
    }
    if (raw.length > MAX_DOSE_TIMES) {
      throw new ValidationException('A medication has too many dose times');
    }
    const cleaned = raw.map((minute) => {
      const value = Medication.cleanScheduleMinute(minute);
      if (value === null) {
        throw new ValidationException('A medication dose time must be a minute within the day');
      }
      return value;
    });
    // Order the times and drop duplicates so the schedule is canonical.
    return [...new Set(cleaned)].sort((a, b) => a - b);
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

  public get purpose(): string | null {
    return this.props.purpose;
  }

  public get prescribedBy(): string | null {
    return this.props.prescribedBy;
  }

  public get startDate(): Date | null {
    return this.props.startDate;
  }

  public get instructions(): string | null {
    return this.props.instructions;
  }

  /** The dose times, falling back to the single schedule minute for legacy rows. */
  public get doseTimes(): number[] {
    if (this.props.doseTimes.length > 0) {
      return [...this.props.doseTimes];
    }
    return this.props.scheduleMinute === null ? [] : [this.props.scheduleMinute];
  }

  public get status(): MedicationStatus {
    return this.props.status;
  }

  public get isActive(): boolean {
    return this.props.status === MedicationStatus.Active;
  }

  public get discontinuedAt(): Date | null {
    return this.props.discontinuedAt;
  }
}
