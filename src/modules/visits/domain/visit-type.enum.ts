/**
 * The kind of care a visit delivers. Drives the "Visit Type" column on the
 * operations schedule. Declared in the domain layer so it is independent of the
 * Prisma generated enum.
 */
export enum VisitType {
  PersonalCare = 'PERSONAL_CARE',
  MorningCare = 'MORNING_CARE',
  Medication = 'MEDICATION',
  PhysicalTherapy = 'PHYSICAL_THERAPY',
  WoundCare = 'WOUND_CARE',
  Companionship = 'COMPANIONSHIP',
}

/** Every valid visit type, used to validate incoming filter values. */
export const ALL_VISIT_TYPES: readonly VisitType[] = Object.values(VisitType);
