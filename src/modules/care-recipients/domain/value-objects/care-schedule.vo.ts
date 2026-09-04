import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { CareFrequency } from '../care-frequency.enum';
import { Weekday, WEEKDAY_ORDER, toWeekday } from '../weekday.enum';

interface CareScheduleProps {
  frequency: CareFrequency;
  estimatedStartDate: Date;
  expectedDuration: string;
  days: Weekday[];
  startMinute: number | null;
  visitDurationMinutes: number | null;
}

interface CareScheduleInput {
  frequency: string;
  estimatedStartDate: Date;
  expectedDuration: string;
  /** Weekdays the recurring visit falls on (for example Mon, Wed, Fri). */
  days?: string[];
  /** Visit start time as minutes from midnight (for example 540 for 9:00 AM). */
  startMinute?: number | null;
  /** How long a single visit lasts, in minutes (for example 180 for three hours). */
  visitDurationMinutes?: number | null;
}

const MAX_DURATION_LENGTH = 120;
const MINUTES_IN_DAY = 24 * 60;

/**
 * When and for how long care is needed. Frequency is a fixed set and the expected
 * engagement duration is free text. The recurring pattern (which weekdays, the
 * start time and how long each visit lasts) is optional so onboarding can capture
 * it later or an office can refine it; each part is validated when present. The
 * estimated start date is validated as a real date; whether it may lie in the past
 * is a use case decision made with the clock.
 */
export class CareSchedule extends ValueObject<CareScheduleProps> {
  private constructor(props: CareScheduleProps) {
    super(props);
  }

  public static create(input: CareScheduleInput): CareSchedule {
    const frequency = CareSchedule.toFrequency(input.frequency);
    if (Number.isNaN(input.estimatedStartDate.getTime())) {
      throw new ValidationException('Estimated start date is not a valid date');
    }
    const expectedDuration = input.expectedDuration.trim();
    if (expectedDuration.length === 0) {
      throw new ValidationException('Expected care duration is required');
    }
    if (expectedDuration.length > MAX_DURATION_LENGTH) {
      throw new ValidationException('Expected care duration exceeds the maximum length');
    }

    return new CareSchedule({
      frequency,
      estimatedStartDate: input.estimatedStartDate,
      expectedDuration,
      days: CareSchedule.toDays(input.days ?? []),
      startMinute: CareSchedule.toStartMinute(input.startMinute ?? null),
      visitDurationMinutes: CareSchedule.toVisitDuration(input.visitDurationMinutes ?? null),
    });
  }

  private static toFrequency(raw: string): CareFrequency {
    const normalised = raw.trim().toUpperCase();
    const match = Object.values(CareFrequency).find(
      (frequency) => String(frequency) === normalised,
    );
    if (match === undefined) {
      throw new ValidationException(
        'Care frequency must be one of ONE_TIME_VISIT, DAILY, WEEKLY or LIVE_IN_CARE',
      );
    }
    return match;
  }

  private static toDays(raw: string[]): Weekday[] {
    const seen = new Set<Weekday>();
    for (const value of raw) {
      const day = toWeekday(value);
      if (day === undefined) {
        throw new ValidationException(`Care day must be a valid weekday, received ${value}`);
      }
      seen.add(day);
    }
    return [...seen].sort((a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b]);
  }

  private static toStartMinute(raw: number | null): number | null {
    if (raw === null) {
      return null;
    }
    if (!Number.isInteger(raw) || raw < 0 || raw >= MINUTES_IN_DAY) {
      throw new ValidationException('Visit start time must be minutes from midnight (0 to 1439)');
    }
    return raw;
  }

  private static toVisitDuration(raw: number | null): number | null {
    if (raw === null) {
      return null;
    }
    if (!Number.isInteger(raw) || raw <= 0 || raw > MINUTES_IN_DAY) {
      throw new ValidationException('Visit duration must be between 1 and 1440 minutes');
    }
    return raw;
  }

  public get frequency(): CareFrequency {
    return this.props.frequency;
  }

  public get estimatedStartDate(): Date {
    return this.props.estimatedStartDate;
  }

  public get expectedDuration(): string {
    return this.props.expectedDuration;
  }

  public get days(): Weekday[] {
    return [...this.props.days];
  }

  public get startMinute(): number | null {
    return this.props.startMinute;
  }

  public get visitDurationMinutes(): number | null {
    return this.props.visitDurationMinutes;
  }
}
