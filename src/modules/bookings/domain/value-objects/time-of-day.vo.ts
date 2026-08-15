import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface TimeOfDayProps {
  minutes: number;
}

const MINUTES_IN_DAY = 24 * 60;

/**
 * A clock time within a day, stored as minutes from midnight. Bookings are
 * offered on the hour, so construction enforces a whole hour.
 */
export class TimeOfDay extends ValueObject<TimeOfDayProps> {
  private constructor(props: TimeOfDayProps) {
    super(props);
  }

  /** Parse an "HH:mm" 24 hour value on the hour (minutes must be 00). */
  public static fromString(raw: string): TimeOfDay {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
    if (match === null) {
      throw new ValidationException('Time must be in HH:mm 24 hour format');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (minutes !== 0) {
      throw new ValidationException('Bookings can only start on the hour');
    }
    return new TimeOfDay({ minutes: hours * 60 });
  }

  public static fromMinutes(minutes: number): TimeOfDay {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes >= MINUTES_IN_DAY) {
      throw new ValidationException('Minutes must be within a single day');
    }
    return new TimeOfDay({ minutes });
  }

  public get minutes(): number {
    return this.props.minutes;
  }

  public get hour(): number {
    return Math.floor(this.props.minutes / 60);
  }

  /** Format as "HH:mm". */
  public toString(): string {
    const hh = String(Math.floor(this.props.minutes / 60)).padStart(2, '0');
    const mm = String(this.props.minutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
