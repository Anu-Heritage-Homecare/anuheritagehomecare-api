/**
 * Compares the identity details the owner provided against what the verification
 * provider returned for the real document holder. Pure domain logic so the match
 * rules are provider agnostic and unit testable. Only fields the provider
 * actually returned are compared; a field the provider omits is not a mismatch.
 */

/** The details the owner claims (from signup plus the date of birth at KYC). */
export interface ClaimedIdentity {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

/** What the provider returned for the document holder. Any field may be absent. */
export interface ProviderIdentity {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
}

/** One field that did not match, with both values kept for the admin audit. */
export interface IdentityMismatch {
  field: string;
  provided: string;
  returned: string;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Normalise a name for comparison: trim, fold case, strip accents, collapse spaces. */
function normaliseName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, ' ');
}

/** Calendar day of a date in UTC, so two dates compare regardless of time. */
function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function compareIdentity(
  claimed: ClaimedIdentity,
  provider: ProviderIdentity,
): IdentityMismatch[] {
  const mismatches: IdentityMismatch[] = [];

  if (
    provider.firstName !== null &&
    provider.firstName !== undefined &&
    normaliseName(claimed.firstName) !== normaliseName(provider.firstName)
  ) {
    mismatches.push({
      field: 'firstName',
      provided: claimed.firstName,
      returned: provider.firstName,
    });
  }

  if (
    provider.lastName !== null &&
    provider.lastName !== undefined &&
    normaliseName(claimed.lastName) !== normaliseName(provider.lastName)
  ) {
    mismatches.push({ field: 'lastName', provided: claimed.lastName, returned: provider.lastName });
  }

  if (
    provider.dateOfBirth !== null &&
    provider.dateOfBirth !== undefined &&
    isoDay(claimed.dateOfBirth) !== isoDay(provider.dateOfBirth)
  ) {
    mismatches.push({
      field: 'dateOfBirth',
      provided: isoDay(claimed.dateOfBirth),
      returned: isoDay(provider.dateOfBirth),
    });
  }

  return mismatches;
}
