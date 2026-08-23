import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AvailabilitySlot } from './value-objects/availability-slot.vo';

interface CaregiverAvailabilityProps {
  caregiverId: string;
  date: Date;
  slots: AvailabilitySlot[];
  createdAt: Date;
  updatedAt: Date;
}

const MAX_SLOTS = 48;

/**
 * CaregiverAvailability aggregate: the set of time windows a caregiver has
 * declared themselves available for on a single day. There is one record per
 * caregiver per day, and the slots are its whole state, so setting them replaces
 * the set. Construction goes through factory methods so the aggregate is never in
 * an invalid state (slots ordered and non overlapping).
 */
export class CaregiverAvailability extends AggregateRoot<string> {
  private props: CaregiverAvailabilityProps;

  private constructor(id: string, props: CaregiverAvailabilityProps) {
    super(id);
    this.props = props;
  }

  /** Open a new availability record for a caregiver on a given day. */
  public static create(params: {
    id: string;
    caregiverId: string;
    date: Date;
    slots?: AvailabilitySlot[];
    now: Date;
  }): CaregiverAvailability {
    const availability = new CaregiverAvailability(params.id, {
      caregiverId: params.caregiverId,
      date: CaregiverAvailability.assertValidDate(params.date),
      slots: [],
      createdAt: params.now,
      updatedAt: params.now,
    });
    availability.setSlots(params.slots ?? [], params.now);
    return availability;
  }

  /** Rehydrate an existing record from persistence without emitting events. */
  public static rehydrate(id: string, props: CaregiverAvailabilityProps): CaregiverAvailability {
    return new CaregiverAvailability(id, {
      ...props,
      slots: CaregiverAvailability.order(props.slots),
    });
  }

  /** Replace the whole set of availability windows for the day. */
  public setSlots(slots: AvailabilitySlot[], now: Date): void {
    if (slots.length > MAX_SLOTS) {
      throw new ValidationException('Too many availability slots for a single day');
    }
    const ordered = CaregiverAvailability.order(slots);
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].overlaps(ordered[index - 1])) {
        throw new ValidationException('Availability slots must not overlap');
      }
    }
    this.props.slots = ordered;
    this.props.updatedAt = now;
  }

  private static order(slots: AvailabilitySlot[]): AvailabilitySlot[] {
    return [...slots].sort((a, b) => a.startMinute - b.startMinute);
  }

  private static assertValidDate(value: Date): Date {
    if (Number.isNaN(value.getTime())) {
      throw new ValidationException('The availability date is not valid');
    }
    return value;
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get date(): Date {
    return this.props.date;
  }

  public get slots(): AvailabilitySlot[] {
    return [...this.props.slots];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
