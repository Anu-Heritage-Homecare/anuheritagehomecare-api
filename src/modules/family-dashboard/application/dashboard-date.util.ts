/** Midnight (UTC) of the day the given instant falls on. */
export function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
  );
}

/**
 * Whole years between a date of birth and a reference instant. Kept as a pure
 * helper so the recipient's age is projected from the clock without the date of
 * birth leaving the application layer.
 */
export function ageInYears(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  const beforeBirthday =
    monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}
