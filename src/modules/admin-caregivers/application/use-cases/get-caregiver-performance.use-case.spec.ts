import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CaregiverPerformanceTabView, CaregiverReadModel } from '../ports/caregiver-read.port';
import { GetCaregiverPerformanceUseCase } from './get-caregiver-performance.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(): CaregiverPerformanceTabView {
  return {
    areasForGrowth: ['Documentation'],
    visits: [
      {
        // On time (+2), completed, 8 minutes overtime.
        scheduledDate: new Date(Date.UTC(2026, 8, 1)),
        startMinute: 480,
        endMinute: 600,
        status: 'COMPLETED',
        clockInAt: new Date(Date.UTC(2026, 8, 1, 8, 2)),
        clockOutAt: new Date(Date.UTC(2026, 8, 1, 10, 10)),
        breakSeconds: 0,
      },
      {
        // Late (+20) and an early departure (-30).
        scheduledDate: new Date(Date.UTC(2026, 8, 2)),
        startMinute: 600,
        endMinute: 660,
        status: 'COMPLETED',
        clockInAt: new Date(Date.UTC(2026, 8, 2, 10, 20)),
        clockOutAt: new Date(Date.UTC(2026, 8, 2, 10, 30)),
        breakSeconds: 0,
      },
      {
        scheduledDate: new Date(Date.UTC(2026, 8, 3)),
        startMinute: 480,
        endMinute: 540,
        status: 'MISSED',
        clockInAt: null,
        clockOutAt: null,
        breakSeconds: 0,
      },
    ],
    ratings: [
      {
        score: 5,
        comment: 'Wonderful.',
        reviewerType: 'FAMILY',
        reviewerName: 'David',
        reviewerRelationship: 'Husband',
        recipientName: 'Margaret',
        traits: ['Attentiveness', 'Reliability'],
        createdAt: new Date(Date.UTC(2026, 8, 15)),
      },
      {
        score: 3,
        comment: 'Reliable.',
        reviewerType: 'COORDINATOR',
        reviewerName: 'Mike',
        reviewerRelationship: 'Coordinator',
        recipientName: null,
        traits: ['Communication'],
        createdAt: new Date(Date.UTC(2026, 8, 10)),
      },
      {
        score: 5,
        comment: null,
        reviewerType: 'FAMILY',
        reviewerName: 'Jen',
        reviewerRelationship: 'Daughter',
        recipientName: 'Eleanor',
        traits: ['Attentiveness'],
        createdAt: new Date(Date.UTC(2026, 7, 20)),
      },
    ],
  };
}

function reads(tab: CaregiverPerformanceTabView | null): CaregiverReadModel {
  return {
    list: () => Promise.resolve({ total: 0, rows: [] }),
    overview: () => Promise.resolve(null),
    scheduleTab: () => Promise.resolve(null),
    performanceTab: () => Promise.resolve(tab),
  };
}

describe('GetCaregiverPerformanceUseCase', () => {
  it('derives the score cards and this month key metrics from the visits', async () => {
    const result = await new GetCaregiverPerformanceUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
    });

    expect(result.periodLabel).toBe('This month');
    expect(result.scoreCards.punctualityPercent).toBe(50);
    expect(result.scoreCards.taskCompletionPercent).toBe(67);
    expect(result.scoreCards.clientSatisfaction).toBe(4.3);
    expect(result.scoreCards.overallScore).toBe(3.4);

    expect(result.keyMetrics.visitsCompleted).toBe(2);
    expect(result.keyMetrics.hoursLogged).toBe(2);
    expect(result.keyMetrics.onTimeArrivals).toEqual({ onTime: 1, total: 2, percent: 50 });
    expect(result.keyMetrics.missedVisits).toBe(1);
    expect(result.keyMetrics.lateArrivals).toEqual({ count: 1, averageMinutesLate: 20 });
    expect(result.keyMetrics.earlyDepartures).toBe(1);
    expect(result.keyMetrics.overtimeHours).toBe(0.1);
  });

  it('spreads the client feedback and ranks the most praised traits', async () => {
    const result = await new GetCaregiverPerformanceUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
    });

    const feedback = result.clientFeedback;
    expect(feedback.averageRating).toBe(4.3);
    expect(feedback.totalReviews).toBe(3);
    expect(feedback.positiveReviews).toBe(2);
    expect(feedback.neutralReviews).toBe(1);
    expect(feedback.negativeReviews).toBe(0);
    expect(feedback.mostPraisedTraits).toEqual(['Attentiveness', 'Reliability', 'Communication']);
    expect(feedback.areasForGrowth).toEqual(['Documentation']);
  });

  it('builds the six month trend and history and the recent reviews', async () => {
    const result = await new GetCaregiverPerformanceUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
    });

    expect(result.trend).toHaveLength(6);
    expect(result.trend.map((p) => p.monthLabel)).toEqual([
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
    ]);
    expect(result.trend[5].score).toBe(3.3);
    expect(result.trend[4].score).toBe(5);
    expect(result.trend[0].score).toBeNull();

    expect(result.history).toHaveLength(6);
    expect(result.history[0].monthLabel).toBe('Sep 2026');
    expect(result.history[0]).toMatchObject({
      visits: 2,
      hours: 2,
      punctualityPercent: 50,
      csat: 4,
    });
    expect(result.history[1]).toMatchObject({ monthLabel: 'Aug 2026', score: 5, csat: 5 });

    const first = result.recentReviews[0];
    expect(first.authorName).toBe('David');
    expect(first.relationship).toBe('Husband');
    expect(first.sentiment).toBe('POSITIVE');
    expect(first.rating).toBe(5);
    expect(first.recipientName).toBe('Margaret');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new GetCaregiverPerformanceUseCase(reads(null), clock).execute({ profileId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
