/**
 * A specific support need a care recipient may have. The onboarding form groups
 * these under Personal Care and Daily Living; the grouping is a presentation
 * concern, so the domain keeps a single flat set of needs.
 */
export enum CareNeed {
  Bathing = 'BATHING',
  Dressing = 'DRESSING',
  Grooming = 'GROOMING',
  Toileting = 'TOILETING',
  MealPreparation = 'MEAL_PREPARATION',
  Housekeeping = 'HOUSEKEEPING',
  Laundry = 'LAUNDRY',
  Shopping = 'SHOPPING',
}

/** Every valid care need, used to validate incoming values. */
export const ALL_CARE_NEEDS: readonly CareNeed[] = Object.values(CareNeed);
