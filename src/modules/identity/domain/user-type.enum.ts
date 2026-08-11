/**
 * The kind of person a user account represents. Both types authenticate the
 * same way; only family members self register in this iteration. Declared in the
 * domain layer so it is independent of the Prisma generated enum.
 */
export enum UserType {
  Caregiver = 'CAREGIVER',
  FamilyMember = 'FAMILY_MEMBER',
}
