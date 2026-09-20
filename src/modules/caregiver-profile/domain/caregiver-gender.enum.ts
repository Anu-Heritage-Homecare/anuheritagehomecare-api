/**
 * Gender recorded on a caregiver profile. The mobile identity account does not
 * capture a caregiver's gender, so it is an admin managed field on the overlay.
 * Values mirror the shared Prisma `Gender` enum.
 */
export enum CaregiverGender {
  Male = 'MALE',
  Female = 'FEMALE',
}

export const ALL_CAREGIVER_GENDERS: readonly CaregiverGender[] = Object.values(CaregiverGender);
