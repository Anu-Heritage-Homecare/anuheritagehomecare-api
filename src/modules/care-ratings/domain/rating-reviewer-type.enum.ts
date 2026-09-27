/**
 * Who authored a care rating. A FAMILY review comes from a family member through
 * the mobile app; a COORDINATOR review is recorded by a care coordinator from the
 * admin back office (the caregiver Performance tab).
 */
export enum RatingReviewerType {
  Family = 'FAMILY',
  Coordinator = 'COORDINATOR',
}

export const ALL_RATING_REVIEWER_TYPES: RatingReviewerType[] = Object.values(RatingReviewerType);
