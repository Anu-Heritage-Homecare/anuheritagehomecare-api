import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RATING_REPOSITORY,
  CareRatingRepository,
} from '@modules/care-ratings/domain/care-rating.repository';
import { CareRating } from '@modules/care-ratings/domain/care-rating.entity';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface RecordCaregiverReviewCommand {
  profileId: string;
  adminId: string;
  reviewerName: string | null;
  score: number;
  comment: string | null;
  traits: string[];
  careRecipientId: string | null;
}

/**
 * A care coordinator records a review of a caregiver from the Performance tab. The
 * review is stored as a COORDINATOR care rating keyed to the caregiver's identity
 * user, with the coordinator's display name snapshotted. Family ratings arrive
 * separately from the mobile app; both feed the caregiver's client feedback.
 */
@Injectable()
export class RecordCaregiverReviewUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CARE_RATING_REPOSITORY) private readonly ratings: CareRatingRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RecordCaregiverReviewCommand): Promise<{ id: string }> {
    const profile = await this.profiles.findById(command.profileId);
    if (profile === null || profile.isArchived) {
      throw new NotFoundDomainException('Caregiver not found');
    }

    const rating = CareRating.recordByCoordinator({
      id: this.ids.generate(),
      caregiverId: profile.userId,
      submittedByAdminId: command.adminId,
      reviewerName: command.reviewerName,
      careRecipientId: command.careRecipientId,
      score: command.score,
      comment: command.comment,
      traits: command.traits,
      now: this.clock.now(),
    });
    await this.ratings.save(rating);
    return { id: rating.id };
  }
}
