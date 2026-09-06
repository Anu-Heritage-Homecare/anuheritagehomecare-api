import { ValidationException } from '@shared/domain/domain-exception';
import { CareRating } from './care-rating.entity';

const NOW = new Date('2026-09-06T09:00:00.000Z');

describe('CareRating', () => {
  it('captures a valid rating and trims the comment', () => {
    const rating = CareRating.submit({
      id: 'r1',
      careRecipientId: 'recipient-1',
      submittedByUserId: 'owner-1',
      score: 5,
      comment: '  Excellent care  ',
      now: NOW,
    });
    expect(rating.score).toBe(5);
    expect(rating.comment).toBe('Excellent care');
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
});
