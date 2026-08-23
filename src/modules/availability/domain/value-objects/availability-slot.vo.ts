import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface AvailabilitySlotProps {
  startMinute: number;
  endMinute: number;
}

const MINUTES_IN_DAY = 24 * 60;

/**
 * One window a caregiver marks themselves available for within a day, stored as
 * minutes from midnight so it stays free of timezone ambiguity. The end must come
 * after the start and both must fall inside a single day. Adjacent slots that
 * touch at a boundary (one ends exactly where the next begins) do not overlap.
 */
export class AvailabilitySlot extends ValueObject<AvailabilitySlotProps> {
  private constructor(props: AvailabilitySlotProps) {
    super(props);
  }

  public static create(startMinute: number, endMinute: number): AvailabilitySlot {
    AvailabilitySlot.assertMinuteOfDay(startMinute, 'Start');
    AvailabilitySlot.assertMinuteOfDay(endMinute, 'End');
    if (endMinute <= startMinute) {
      throw new ValidationException('An availability slot must end after it starts');
    }
    return new AvailabilitySlot({ startMinute, endMinute });
  }

  private static assertMinuteOfDay(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0 || value > MINUTES_IN_DAY) {
      throw new ValidationException(`${label} time must be a minute within the day`);
    }
  }

  /** True when this slot overlaps another; touching at a boundary does not count. */
  public overlaps(other: AvailabilitySlot): boolean {
    return (
      this.props.startMinute < other.props.endMinute &&
      other.props.startMinute < this.props.endMinute
    );
  }

  public get startMinute(): number {
    return this.props.startMinute;
  }

  public get endMinute(): number {
    return this.props.endMinute;
  }
}
