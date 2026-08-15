/**
 * The onboarding wizard step a family owner should resume at. Persisted with the
 * draft so that, if they leave the app mid onboarding and return later, the
 * client can send them straight back to where they stopped.
 *
 * The values are ordered from earliest to latest; the pointer only ever moves
 * forward (editing an earlier step never regresses progress).
 */
export enum OnboardingStep {
  Profile = 'PROFILE',
  CareNeeds = 'CARE_NEEDS',
  Health = 'HEALTH',
  Schedule = 'SCHEDULE',
  Review = 'REVIEW',
  Completed = 'COMPLETED',
}

const STEP_ORDER: readonly OnboardingStep[] = [
  OnboardingStep.Profile,
  OnboardingStep.CareNeeds,
  OnboardingStep.Health,
  OnboardingStep.Schedule,
  OnboardingStep.Review,
  OnboardingStep.Completed,
];

/** Return whichever step is furthest along the wizard, so progress only advances. */
export function furthestStep(a: OnboardingStep, b: OnboardingStep): OnboardingStep {
  return STEP_ORDER.indexOf(a) >= STEP_ORDER.indexOf(b) ? a : b;
}
