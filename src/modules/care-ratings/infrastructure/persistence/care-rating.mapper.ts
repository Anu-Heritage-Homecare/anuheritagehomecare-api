import { CareRating as PrismaCareRating } from '@prisma/client';
import { CareRating } from '../../domain/care-rating.entity';

/** Translates between the Prisma CareRating row and the aggregate. */
export class CareRatingMapper {
  static toDomain(row: PrismaCareRating): CareRating {
    return CareRating.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      visitId: row.visitId,
      submittedByUserId: row.submittedByUserId,
      score: row.score,
      comment: row.comment,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(rating: CareRating): PrismaCareRating {
    return {
      id: rating.id,
      careRecipientId: rating.careRecipientId,
      visitId: rating.visitId,
      submittedByUserId: rating.submittedByUserId,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt,
    };
  }
}
