import { CaregiverAvailability } from '../../domain/caregiver-availability.entity';
import { toIsoDate } from '../availability-date.util';

/** One available window within a day, as minutes from midnight. */
export interface AvailabilitySlotResult {
  startMinute: number;
  endMinute: number;
}

/** A caregiver's availability for a single day. */
export interface AvailabilityResult {
  caregiverId: string;
  date: string;
  /** Optimistic concurrency version to send back on the next edit of this day. */
  revision: number;
  slots: AvailabilitySlotResult[];
}

/**
 * The availability picker's view of one day: the caregiver's declared available
 * windows plus the windows already booked by scheduled visits (which the UI greys
 * out). Both are minutes from midnight.
 */
export interface DayAvailabilityResult {
  date: string;
  availableSlots: AvailabilitySlotResult[];
  bookedSlots: AvailabilitySlotResult[];
}

export function toAvailabilityResult(availability: CaregiverAvailability): AvailabilityResult {
  return {
    caregiverId: availability.caregiverId,
    date: toIsoDate(availability.date),
    revision: availability.revision,
    slots: availability.slots.map((slot) => ({
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
    })),
  };
}
