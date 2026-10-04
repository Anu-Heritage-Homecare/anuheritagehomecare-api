import { CareRating } from './care-rating.entity';

/** The average satisfaction across all ratings, with the sample size. */
export interface RatingSummary {
  /** Mean score (1 to 5), or null when there are no ratings yet. */
  average: number | null;
  count: number;
}

/** Persistence port for care ratings. */
export interface CareRatingRepository {
  save(rating: CareRating): Promise<void>;
  /** Average score and count across ratings created on or after `since` (or all time when null). */
  summarise(since: Date | null): Promise<RatingSummary>;
  /** Average score and count of the ratings a caregiver has received. */
  averageForCaregiver(caregiverId: string): Promise<RatingSummary>;
}

export const CARE_RATING_REPOSITORY = Symbol('CARE_RATING_REPOSITORY');
