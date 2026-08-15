import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { CareFrequency } from '../care-frequency.enum';

interface CareScheduleProps {
  frequency: CareFrequency;
  estimatedStartDate: Date;
  expectedDuration: string;
}

interface CareScheduleInput {
  frequency: string;
  estimatedStartDate: Date;
  expectedDuration: string;
}

const MAX_DURATION_LENGTH = 120;

/**
 * When and for how long care is needed. Frequency is a fixed set; the expected
 * duration is free text. The estimated start date is validated as a real date;
 * whether it may lie in the past is a use case decision made with the clock.
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

  public get frequency(): CareFrequency {
    return this.props.frequency;
  }

  public get estimatedStartDate(): Date {
    return this.props.estimatedStartDate;
  }

  public get expectedDuration(): string {
    return this.props.expectedDuration;
  }
}
