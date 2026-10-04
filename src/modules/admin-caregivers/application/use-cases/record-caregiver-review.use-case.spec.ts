import { CareRating } from '@modules/care-ratings/domain/care-rating.entity';
import { CareRatingRepository } from '@modules/care-ratings/domain/care-rating.repository';
import { RatingReviewerType } from '@modules/care-ratings/domain/rating-reviewer-type.enum';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { RecordCaregiverReviewUseCase } from './record-caregiver-review.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'rating-new' };

function profileRepo(profile: CaregiverProfile | null): CaregiverProfileRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(profile),
    findByUserId: () => Promise.resolve(null),
  };
}

function ratingRepo(): CareRatingRepository & { saved: CareRating[] } {
  const saved: CareRating[] = [];
  return {
    saved,
    save: (r) => {
      saved.push(r);
      return Promise.resolve();
    },
    summarise: () => Promise.resolve({ average: null, count: 0 }),
    averageForCaregiver: () => Promise.resolve({ average: null, count: 0 }),
  };
}

describe('RecordCaregiverReviewUseCase', () => {
  it('records a coordinator review keyed to the caregiver user', async () => {
    const profile = CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
    const store = ratingRepo();
    const result = await new RecordCaregiverReviewUseCase(
      profileRepo(profile),
      store,
      ids,
      clock,
    ).execute({
      profileId: 'cg-1',
      adminId: 'admin-1',
      reviewerName: 'Mike Chen',
      score: 5,
      comment: 'Consistently reliable.',
      traits: ['Communication', 'Reliability'],
      careRecipientId: null,
    });

    expect(result.id).toBe('rating-new');
    expect(store.saved).toHaveLength(1);
    const saved = store.saved[0];
    expect(saved.caregiverId).toBe('user-1');
    expect(saved.reviewerType).toBe(RatingReviewerType.Coordinator);
    expect(saved.reviewerName).toBe('Mike Chen');
    expect(saved.submittedByAdminId).toBe('admin-1');
    expect(saved.traits).toEqual(['Communication', 'Reliability']);
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new RecordCaregiverReviewUseCase(profileRepo(null), ratingRepo(), ids, clock).execute({
        profileId: 'nope',
        adminId: 'admin-1',
        reviewerName: null,
        score: 4,
        comment: null,
        traits: [],
        careRecipientId: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
