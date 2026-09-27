import {
  CareRating as PrismaCareRating,
  RatingReviewerType as PrismaRatingReviewerType,
} from '@prisma/client';
import { CareRating } from '../../domain/care-rating.entity';
import { RatingReviewerType } from '../../domain/rating-reviewer-type.enum';

const TO_DOMAIN_REVIEWER: Record<PrismaRatingReviewerType, RatingReviewerType> = {
  FAMILY: RatingReviewerType.Family,
  COORDINATOR: RatingReviewerType.Coordinator,
};

const TO_PERSISTENCE_REVIEWER: Record<RatingReviewerType, PrismaRatingReviewerType> = {
  [RatingReviewerType.Family]: 'FAMILY',
  [RatingReviewerType.Coordinator]: 'COORDINATOR',
};

/** Translates between the Prisma CareRating row and the aggregate. */
export class CareRatingMapper {
  static toDomain(row: PrismaCareRating): CareRating {
    return CareRating.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      caregiverId: row.caregiverId,
      visitId: row.visitId,
      submittedByUserId: row.submittedByUserId,
      submittedByAdminId: row.submittedByAdminId,
      reviewerType: TO_DOMAIN_REVIEWER[row.reviewerType],
      reviewerName: row.reviewerName,
      reviewerRelationship: row.reviewerRelationship,
      score: row.score,
      comment: row.comment,
      traits: row.traits,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(rating: CareRating): PrismaCareRating {
    return {
      id: rating.id,
      careRecipientId: rating.careRecipientId,
      caregiverId: rating.caregiverId,
      visitId: rating.visitId,
      submittedByUserId: rating.submittedByUserId,
      submittedByAdminId: rating.submittedByAdminId,
      reviewerType: TO_PERSISTENCE_REVIEWER[rating.reviewerType],
      reviewerName: rating.reviewerName,
      reviewerRelationship: rating.reviewerRelationship,
      score: rating.score,
      comment: rating.comment,
      traits: rating.traits,
      createdAt: rating.createdAt,
    };
  }
}
