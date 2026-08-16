import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VisitWindowProps {
  startMinute: number;
  endMinute: number;
}

const MINUTES_IN_DAY = 24 * 60;

/**
 * The time window of a visit within its scheduled day, stored as minutes from
 * midnight so it stays free of timezone ambiguity. The end must come after the
 * start and both must fall inside a single day.
 */
export class VisitWindow extends ValueObject<VisitWindowProps> {
  private constructor(props: VisitWindowProps) {
    super(props);
  }

  public static create(startMinute: number, endMinute: number): VisitWindow {
    VisitWindow.assertMinuteOfDay(startMinute, 'Start');
    VisitWindow.assertMinuteOfDay(endMinute, 'End');
    if (endMinute <= startMinute) {
      throw new ValidationException('The visit end time must be after the start time');
    }
    return new VisitWindow({ startMinute, endMinute });
  }

  private static assertMinuteOfDay(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0 || value > MINUTES_IN_DAY) {
      throw new ValidationException(`${label} time must be a minute within the day`);
    }
  }

  public get startMinute(): number {
    return this.props.startMinute;
  }

  public get endMinute(): number {
    return this.props.endMinute;
  }
}
