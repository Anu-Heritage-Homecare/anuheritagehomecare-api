/**
 * The client lifecycle funnel: an application moves forward through these stages
 * from first request to an activated subscription. The order here is the funnel
 * order and is used to enforce forward only progression and to compute stage timing.
 */
export enum OnboardingStage {
  NewRequest = 'NEW_REQUEST',
  PlanSelected = 'PLAN_SELECTED',
  PaymentReceived = 'PAYMENT_RECEIVED',
  PendingReview = 'PENDING_REVIEW',
  DocVerified = 'DOC_VERIFIED',
  CoordinatorAssigned = 'COORDINATOR_ASSIGNED',
  CaregiverScheduled = 'CAREGIVER_SCHEDULED',
  SubActivated = 'SUB_ACTIVATED',
}

/** The stages in funnel order. */
export const ORDERED_ONBOARDING_STAGES: OnboardingStage[] = [
  OnboardingStage.NewRequest,
  OnboardingStage.PlanSelected,
  OnboardingStage.PaymentReceived,
  OnboardingStage.PendingReview,
  OnboardingStage.DocVerified,
  OnboardingStage.CoordinatorAssigned,
  OnboardingStage.CaregiverScheduled,
  OnboardingStage.SubActivated,
];

/** The position of a stage in the funnel (0 based). */
export function stageOrder(stage: OnboardingStage): number {
  return ORDERED_ONBOARDING_STAGES.indexOf(stage);
}
