import { ValidationException } from '@shared/domain/domain-exception';
import { CareRating } from './care-rating.entity';
import { RatingReviewerType } from './rating-reviewer-type.enum';

const NOW = new Date('2026-09-06T09:00:00.000Z');

describe('CareRating', () => {
  it('captures a valid family rating, trims the comment and dedupes traits', () => {
    const rating = CareRating.submit({
      id: 'r1',
      careRecipientId: 'recipient-1',
      caregiverId: 'caregiver-1',
      submittedByUserId: 'owner-1',
      reviewerName: '  David Johnson  ',
      reviewerRelationship: 'Husband',
      score: 5,
      comment: '  Excellent care  ',
      traits: [' Attentiveness ', 'Reliability', 'Attentiveness'],
      now: NOW,
    });
    expect(rating.score).toBe(5);
    expect(rating.comment).toBe('Excellent care');
    expect(rating.reviewerType).toBe(RatingReviewerType.Family);
    expect(rating.reviewerName).toBe('David Johnson');
    expect(rating.traits).toEqual(['Attentiveness', 'Reliability']);
  });

  it('records a coordinator review with the coordinator relationship', () => {
    const rating = CareRating.recordByCoordinator({
      id: 'r2',
      caregiverId: 'caregiver-1',
      submittedByAdminId: 'admin-1',
      reviewerName: 'Mike Chen',
      score: 5,
      comment: 'Consistently reliable.',
      traits: ['Communication'],
      now: NOW,
    });
    expect(rating.reviewerType).toBe(RatingReviewerType.Coordinator);
    expect(rating.reviewerRelationship).toBe('Coordinator');
    expect(rating.submittedByAdminId).toBe('admin-1');
    expect(rating.careRecipientId).toBeNull();
  });

  it('rejects a score outside 1 to 5', () => {
    expect(() =>
      CareRating.submit({
        id: 'r1',
        careRecipientId: 'recipient-1',
        submittedByUserId: 'owner-1',
        score: 6,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });

  it('rejects a coordinator review without a caregiver', () => {
    expect(() =>
      CareRating.recordByCoordinator({
        id: 'r3',
        caregiverId: '  ',
        submittedByAdminId: 'admin-1',
        score: 4,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
