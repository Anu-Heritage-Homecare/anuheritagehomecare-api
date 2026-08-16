/**
 * Whole years between a date of birth and a reference instant. Kept as a pure
 * helper so the schedule use cases can project a recipient's age from the clock
 * without leaking the date of birth past the application layer.
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
