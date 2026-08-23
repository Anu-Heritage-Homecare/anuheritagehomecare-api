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
  slots: AvailabilitySlotResult[];
}

export function toAvailabilityResult(availability: CaregiverAvailability): AvailabilityResult {
  return {
    caregiverId: availability.caregiverId,
    date: toIsoDate(availability.date),
    slots: availability.slots.map((slot) => ({
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
    })),
  };
}
