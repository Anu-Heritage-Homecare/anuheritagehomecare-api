/**
 * A day of the week a recurring care visit falls on. Used by the care schedule to
 * record which days care is delivered (for example Monday, Wednesday, Friday).
 */
export enum Weekday {
  Monday = 'MONDAY',
  Tuesday = 'TUESDAY',
  Wednesday = 'WEDNESDAY',
  Thursday = 'THURSDAY',
  Friday = 'FRIDAY',
  Saturday = 'SATURDAY',
  Sunday = 'SUNDAY',
}

/** Calendar order (Monday first), so a set of days always reads in week order. */
export const WEEKDAY_ORDER: Record<Weekday, number> = {
  [Weekday.Monday]: 0,
  [Weekday.Tuesday]: 1,
  [Weekday.Wednesday]: 2,
  [Weekday.Thursday]: 3,
  [Weekday.Friday]: 4,
  [Weekday.Saturday]: 5,
  [Weekday.Sunday]: 6,
};

/** Short display label for a weekday (for example Mon), for read models. */
export const WEEKDAY_SHORT_LABEL: Record<Weekday, string> = {
  [Weekday.Monday]: 'Mon',
  [Weekday.Tuesday]: 'Tue',
  [Weekday.Wednesday]: 'Wed',
  [Weekday.Thursday]: 'Thu',
  [Weekday.Friday]: 'Fri',
  [Weekday.Saturday]: 'Sat',
  [Weekday.Sunday]: 'Sun',
};

/** Resolve a raw string to a Weekday, or undefined when it is not one. */
export function toWeekday(raw: string): Weekday | undefined {
  const normalised = raw.trim().toUpperCase();
  return Object.values(Weekday).find((day) => String(day) === normalised);
}
