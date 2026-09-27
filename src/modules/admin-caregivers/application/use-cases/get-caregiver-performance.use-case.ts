import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CAREGIVER_READ_MODEL,
  CaregiverPerformanceRatingView,
  CaregiverPerformanceVisitView,
  CaregiverReadModel,
} from '../ports/caregiver-read.port';
import {
  CaregiverPerformanceHistoryRowResult,
  CaregiverPerformanceTabResult,
  CaregiverPerformanceTrendPointResult,
  CaregiverReviewResult,
} from '../dto/caregiver-performance.result';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HISTORY_MONTHS = 6;
/** Arrival within this many minutes of the scheduled start counts as on time. */
const ON_TIME_GRACE_MINUTES = 5;
/** Leaving this many minutes before the scheduled end counts as an early departure. */
const EARLY_DEPARTURE_GRACE_MINUTES = 5;
const RECENT_REVIEWS_LIMIT = 8;
const PRAISED_TRAITS_LIMIT = 3;
const MINUTE_MS = 60_000;
const COMPLETED = 'COMPLETED';
const MISSED = 'MISSED';

/** Per visit timing derived once, then aggregated by month and for this month. */
interface DerivedVisit {
  monthKey: number;
  status: string;
  /** Arrival minus scheduled start, in minutes, when the caregiver clocked in. */
  arrivalDelta: number | null;
  /** Clock out minus scheduled end, in minutes, when the caregiver clocked out. */
  departureDelta: number | null;
  /** Worked minutes (clocked span minus breaks) for a completed, clocked visit. */
  workedMinutes: number | null;
  windowMinutes: number;
}

interface MonthAggregate {
  completed: number;
  missed: number;
  clockedIn: number;
  onTime: number;
  workedMinutes: number;
  ratingSum: number;
  ratingCount: number;
}

interface GetCaregiverPerformanceCommand {
  profileId: string;
}

/**
 * The caregiver Performance tab: the four score cards, this month's key metrics,
 * the client feedback spread with praised traits, the six month trend and history,
 * and the recent reviews. Read only; every figure is derived server side from the
 * caregiver's visits (completion, punctuality, hours, overtime) and ratings.
 */
@Injectable()
export class GetCaregiverPerformanceUseCase {
  constructor(
    @Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetCaregiverPerformanceCommand): Promise<CaregiverPerformanceTabResult> {
    const now = this.clock.now();
    const view = await this.reads.performanceTab(command.profileId, now);
    if (view === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }

    const thisMonthKey = monthKey(now);
    const derived = view.visits.map((visit) => this.derive(visit));
    const months = this.monthAggregates(derived, view.ratings);
    const thisMonth = derived.filter((v) => v.monthKey === thisMonthKey);

    const ratingAverage = average(view.ratings.map((r) => r.score));

    return {
      periodLabel: 'This month',
      scoreCards: {
        overallScore: this.qualityScore(months.get(thisMonthKey), ratingAverage),
        punctualityPercent: this.punctuality(thisMonth),
        clientSatisfaction: ratingAverage === null ? null : round1(ratingAverage),
        taskCompletionPercent: this.taskCompletion(thisMonth),
      },
      keyMetrics: this.keyMetrics(thisMonth),
      clientFeedback: {
        averageRating: ratingAverage === null ? null : round1(ratingAverage),
        totalReviews: view.ratings.length,
        positiveReviews: view.ratings.filter((r) => r.score >= 4).length,
        neutralReviews: view.ratings.filter((r) => r.score === 3).length,
        negativeReviews: view.ratings.filter((r) => r.score <= 2).length,
        mostPraisedTraits: this.mostPraisedTraits(view.ratings),
        areasForGrowth: view.areasForGrowth,
      },
      trend: this.trend(months, thisMonthKey),
      history: this.history(months, thisMonthKey),
      recentReviews: view.ratings.slice(0, RECENT_REVIEWS_LIMIT).map((r) => this.toReview(r)),
    };
  }

  private derive(visit: CaregiverPerformanceVisitView): DerivedVisit {
    const dayStart = startOfUtcDay(visit.scheduledDate).getTime();
    const scheduledStart = dayStart + visit.startMinute * MINUTE_MS;
    const scheduledEnd = dayStart + visit.endMinute * MINUTE_MS;
    const windowMinutes = Math.max(0, visit.endMinute - visit.startMinute);
    const arrivalDelta =
      visit.clockInAt === null
        ? null
        : Math.round((visit.clockInAt.getTime() - scheduledStart) / MINUTE_MS);
    const departureDelta =
      visit.clockOutAt === null
        ? null
        : Math.round((visit.clockOutAt.getTime() - scheduledEnd) / MINUTE_MS);
    let workedMinutes: number | null = null;
    if (visit.status === COMPLETED && visit.clockInAt !== null && visit.clockOutAt !== null) {
      const gross = Math.floor(
        (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / MINUTE_MS,
      );
      workedMinutes = Math.max(0, gross - Math.floor(visit.breakSeconds / 60));
    }
    return {
      monthKey: monthKey(visit.scheduledDate),
      status: visit.status,
      arrivalDelta,
      departureDelta,
      workedMinutes,
      windowMinutes,
    };
  }

  private monthAggregates(
    derived: DerivedVisit[],
    ratings: CaregiverPerformanceRatingView[],
  ): Map<number, MonthAggregate> {
    const months = new Map<number, MonthAggregate>();
    const bucket = (key: number): MonthAggregate => {
      const existing = months.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const fresh: MonthAggregate = {
        completed: 0,
        missed: 0,
        clockedIn: 0,
        onTime: 0,
        workedMinutes: 0,
        ratingSum: 0,
        ratingCount: 0,
      };
      months.set(key, fresh);
      return fresh;
    };

    for (const visit of derived) {
      const month = bucket(visit.monthKey);
      if (visit.status === COMPLETED) {
        month.completed += 1;
        month.workedMinutes += visit.workedMinutes ?? 0;
      } else if (visit.status === MISSED) {
        month.missed += 1;
      }
      if (visit.arrivalDelta !== null) {
        month.clockedIn += 1;
        if (visit.arrivalDelta <= ON_TIME_GRACE_MINUTES) {
          month.onTime += 1;
        }
      }
    }
    for (const rating of ratings) {
      const month = bucket(monthKey(rating.createdAt));
      month.ratingSum += rating.score;
      month.ratingCount += 1;
    }
    return months;
  }

  private keyMetrics(thisMonth: DerivedVisit[]): CaregiverPerformanceTabResult['keyMetrics'] {
    const completed = thisMonth.filter((v) => v.status === COMPLETED);
    const clockedIn = thisMonth.filter((v) => v.arrivalDelta !== null);
    const onTime = clockedIn.filter((v) => (v.arrivalDelta ?? 0) <= ON_TIME_GRACE_MINUTES).length;
    const late = clockedIn.filter((v) => (v.arrivalDelta ?? 0) > ON_TIME_GRACE_MINUTES);
    const workedMinutes = completed.reduce((sum, v) => sum + (v.workedMinutes ?? 0), 0);
    const overtimeMinutes = completed.reduce(
      (sum, v) => sum + Math.max(0, (v.workedMinutes ?? 0) - v.windowMinutes),
      0,
    );
    const earlyDepartures = completed.filter(
      (v) => v.departureDelta !== null && v.departureDelta < -EARLY_DEPARTURE_GRACE_MINUTES,
    ).length;

    return {
      visitsCompleted: completed.length,
      hoursLogged: Math.round(workedMinutes / 60),
      onTimeArrivals: {
        onTime,
        total: clockedIn.length,
        percent: clockedIn.length === 0 ? null : Math.round((onTime / clockedIn.length) * 100),
      },
      missedVisits: thisMonth.filter((v) => v.status === MISSED).length,
      lateArrivals: {
        count: late.length,
        averageMinutesLate:
          late.length === 0
            ? null
            : Math.round(late.reduce((sum, v) => sum + (v.arrivalDelta ?? 0), 0) / late.length),
      },
      earlyDepartures,
      overtimeHours: round1(overtimeMinutes / 60),
    };
  }

  private trend(
    months: Map<number, MonthAggregate>,
    thisMonthKey: number,
  ): CaregiverPerformanceTrendPointResult[] {
    return this.monthKeys(thisMonthKey).map((key) => ({
      monthLabel: MONTHS[key % 12],
      score: this.qualityScore(months.get(key), monthRatingAverage(months.get(key))),
    }));
  }

  private history(
    months: Map<number, MonthAggregate>,
    thisMonthKey: number,
  ): CaregiverPerformanceHistoryRowResult[] {
    return this.monthKeys(thisMonthKey)
      .slice()
      .reverse()
      .map((key) => {
        const month = months.get(key);
        const csat = monthRatingAverage(month);
        return {
          monthLabel: `${MONTHS[key % 12]} ${Math.floor(key / 12)}`,
          score: this.qualityScore(month, csat),
          visits: month?.completed ?? 0,
          hours: month === undefined ? 0 : Math.round(month.workedMinutes / 60),
          punctualityPercent:
            month === undefined || month.clockedIn === 0
              ? null
              : Math.round((month.onTime / month.clockedIn) * 100),
          csat: csat === null ? null : round1(csat),
        };
      });
  }

  /** The six month keys ending at (and including) this month, oldest first. */
  private monthKeys(thisMonthKey: number): number[] {
    return Array.from(
      { length: HISTORY_MONTHS },
      (_v, i) => thisMonthKey - (HISTORY_MONTHS - 1 - i),
    );
  }

  private punctuality(thisMonth: DerivedVisit[]): number | null {
    const clockedIn = thisMonth.filter((v) => v.arrivalDelta !== null);
    if (clockedIn.length === 0) {
      return null;
    }
    const onTime = clockedIn.filter((v) => (v.arrivalDelta ?? 0) <= ON_TIME_GRACE_MINUTES).length;
    return Math.round((onTime / clockedIn.length) * 100);
  }

  private taskCompletion(thisMonth: DerivedVisit[]): number | null {
    const completed = thisMonth.filter((v) => v.status === COMPLETED).length;
    const missed = thisMonth.filter((v) => v.status === MISSED).length;
    const total = completed + missed;
    return total === 0 ? null : Math.round((completed / total) * 100);
  }

  /**
   * Composite quality score (0 to 5) blending completion, on time arrival and
   * client satisfaction. Only the components with data contribute, reweighted;
   * null when nothing is measurable.
   */
  private qualityScore(
    month: MonthAggregate | undefined,
    ratingAverage: number | null,
  ): number | null {
    if (month === undefined) {
      return ratingAverage === null ? null : round1(ratingAverage);
    }
    const components: { weight: number; fraction: number }[] = [];
    const decided = month.completed + month.missed;
    if (decided > 0) {
      components.push({ weight: 0.4, fraction: month.completed / decided });
    }
    if (month.clockedIn > 0) {
      components.push({ weight: 0.3, fraction: month.onTime / month.clockedIn });
    }
    if (ratingAverage !== null) {
      components.push({ weight: 0.3, fraction: ratingAverage / 5 });
    }
    if (components.length === 0) {
      return null;
    }
    const weightSum = components.reduce((sum, c) => sum + c.weight, 0);
    const weighted = components.reduce((sum, c) => sum + c.weight * c.fraction, 0);
    return round1((weighted / weightSum) * 5);
  }

  private mostPraisedTraits(ratings: CaregiverPerformanceRatingView[]): string[] {
    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const rating of ratings) {
      for (const trait of rating.traits) {
        if (!counts.has(trait)) {
          order.push(trait);
        }
        counts.set(trait, (counts.get(trait) ?? 0) + 1);
      }
    }
    return order
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
      .slice(0, PRAISED_TRAITS_LIMIT);
  }

  private toReview(rating: CaregiverPerformanceRatingView): CaregiverReviewResult {
    return {
      authorName: rating.reviewerName,
      relationship: rating.reviewerRelationship,
      reviewerType: rating.reviewerType,
      sentiment: rating.score >= 4 ? 'POSITIVE' : rating.score === 3 ? 'NEUTRAL' : 'NEGATIVE',
      rating: rating.score,
      comment: rating.comment,
      recipientName: rating.recipientName,
      createdAt: rating.createdAt.toISOString(),
    };
  }
}

/** Month index: year times twelve plus the zero based month, for bucketing. */
function monthKey(value: Date): number {
  return value.getUTCFullYear() * 12 + value.getUTCMonth();
}

/** Midnight (UTC) of the day the instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function monthRatingAverage(month: MonthAggregate | undefined): number | null {
  if (month === undefined || month.ratingCount === 0) {
    return null;
  }
  return month.ratingSum / month.ratingCount;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
