/**
 * The verification status shown in the Central Verification Queue, independent of
 * the funnel stage: an application under review can be approved, sent back for more
 * information, or rejected.
 */
export enum OnboardingStatus {
  Pending = 'PENDING',
  UnderReview = 'UNDER_REVIEW',
  NeedsInfo = 'NEEDS_INFO',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}

export const ALL_ONBOARDING_STATUSES: OnboardingStatus[] = Object.values(OnboardingStatus);
