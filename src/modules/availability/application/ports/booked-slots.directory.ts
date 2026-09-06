/**
 * A window on a day the caregiver is already committed to (a scheduled visit), as
 * minutes from midnight. The availability picker greys these out so a caregiver
 * cannot mark themselves unavailable during work they are already assigned.
 */
export interface BookedSlot {
  startMinute: number;
  endMinute: number;
}

/**
 * Read port over the caregiver's committed visits for a day, owned by the
 * availability context and implemented by an adapter onto the visits context. It
 * keeps the application layer free of the visits domain types.
 */
export interface BookedSlotsDirectory {
  forCaregiverOnDay(caregiverId: string, day: Date): Promise<BookedSlot[]>;
}

export const BOOKED_SLOTS_DIRECTORY = Symbol('BOOKED_SLOTS_DIRECTORY');
