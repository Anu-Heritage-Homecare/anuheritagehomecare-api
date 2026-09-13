import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  RECIPIENT_VISITS_READ_MODEL,
  RecipientVisitRowView,
  RecipientVisitsReadModel,
  RecipientVisitsStatsView,
} from '../ports/recipient-visits-read.port';
import {
  RecipientVisitsResult,
  VisitRowResult,
  VisitsAnalyticsResult,
  VisitsSummaryResult,
} from '../dto/recipient-visits.result';

export interface GetRecipientVisitsQuery {
  recipientId: string;
  from: Date | null;
  to: Date | null;
  caregiverId: string | null;
  visitType: VisitType | null;
  status: VisitStatus | null;
  search: string | null;
  page: number;
  pageSize: number;
}

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
/** Number of trailing weeks the analytics trend chart covers. */
const TREND_WEEKS = 8;
/** Grace before a completed visit's late clock in counts as a Late Arrival. */
const LATE_GRACE_MINUTES = 10;

/**
 * Use case: assemble one recipient's Visits tab. Reads a filtered, paginated page
 * and the whole history aggregates from the read model, resolves caregiver names
 * from the identity context, derives the summary card rates, the Late Arrival flag
 * and the weekly trend. Aggregates cover the full history regardless of the table
 * filter, matching the screen where the cards and analytics stay put as the table
 * is filtered.
 */
@Injectable()
export class GetRecipientVisitsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_VISITS_READ_MODEL) private readonly readModel: RecipientVisitsReadModel,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetRecipientVisitsQuery): Promise<RecipientVisitsResult> {
    if ((await this.recipients.findById(query.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const trendFrom = new Date(startOfUtcDay(now).getTime() - TREND_WEEKS * MS_PER_WEEK);

    const [page, stats] = await Promise.all([
      this.readModel.listPage({
        recipientId: query.recipientId,
        from: query.from,
        to: query.to,
        caregiverId: query.caregiverId,
        visitType: query.visitType,
        status: query.status,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      }),
      this.readModel.stats(query.recipientId, monthStart, trendFrom),
    ]);

    const caregiverIds = [
      ...new Set([
        ...page.rows.map((r) => r.caregiverId),
        ...stats.caregiverCounts.map((c) => c.caregiverId),
      ]),
    ].filter((id): id is string => id !== null);
    const caregiverName = new Map(
      (await this.users.findByIds(caregiverIds)).map((u) => [u.id, u.name.fullName]),
    );

    const totalPages = query.pageSize > 0 ? Math.ceil(page.total / query.pageSize) : 0;

    return {
      summary: this.buildSummary(stats),
      caregivers: stats.caregiverCounts.map((c) => ({
        id: c.caregiverId,
        name: caregiverName.get(c.caregiverId) ?? null,
      })),
      page: {
        items: page.rows.map((row) => this.toRow(row, caregiverName)),
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages,
      },
      analytics: this.buildAnalytics(stats, caregiverName, now),
    };
  }

  private buildSummary(stats: RecipientVisitsStatsView): VisitsSummaryResult {
    const completionRatePercent =
      stats.totalVisits === 0 ? 0 : round1((stats.completedVisits / stats.totalVisits) * 100);
    return {
      totalVisits: stats.totalVisits,
      thisMonthVisits: stats.thisMonthVisits,
      avgDurationHours: round1(stats.avgDurationMinutes / 60),
      completionRatePercent,
      successfulVisits: stats.completedVisits,
    };
  }

  private toRow(row: RecipientVisitRowView, caregiverName: Map<string, string>): VisitRowResult {
    return {
      id: row.id,
      date: row.scheduledDate,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      caregiverId: row.caregiverId,
      caregiverName: row.caregiverId === null ? null : (caregiverName.get(row.caregiverId) ?? null),
      visitType: String(row.visitType),
      durationMinutes: Math.max(0, row.endMinute - row.startMinute),
      clockInAt: row.clockInAt,
      clockOutAt: row.clockOutAt,
      status: String(row.status),
      lateArrival: this.isLateArrival(row),
    };
  }

  private isLateArrival(row: RecipientVisitRowView): boolean {
    if (row.status !== VisitStatus.Completed || row.clockInAt === null) {
      return false;
    }
    const arrivalMinute = row.clockInAt.getUTCHours() * 60 + row.clockInAt.getUTCMinutes();
    return arrivalMinute > row.startMinute + LATE_GRACE_MINUTES;
  }

  private buildAnalytics(
    stats: RecipientVisitsStatsView,
    caregiverName: Map<string, string>,
    now: Date,
  ): VisitsAnalyticsResult {
    const weeklyCounts = this.weeklyCounts(stats.trendDates, now);
    return {
      weeklyCounts,
      visitsPerWeekTrendPercent: this.trendPercent(weeklyCounts),
      mostCommonVisitType: this.mostCommonType(stats),
      primaryCaregiverCoverage: this.coverage(stats, caregiverName),
    };
  }

  private weeklyCounts(trendDates: Date[], now: Date): number[] {
    const windowStart = startOfUtcDay(now).getTime() - (TREND_WEEKS - 1) * MS_PER_WEEK;
    const buckets = new Array<number>(TREND_WEEKS).fill(0);
    for (const date of trendDates) {
      const index = Math.floor((date.getTime() - windowStart) / MS_PER_WEEK);
      if (index >= 0 && index < TREND_WEEKS) {
        buckets[index] += 1;
      }
    }
    return buckets;
  }

  private trendPercent(weeklyCounts: number[]): number | null {
    const half = Math.floor(weeklyCounts.length / 2);
    if (half === 0) {
      return null;
    }
    const prior = weeklyCounts.slice(0, half).reduce((sum, n) => sum + n, 0);
    const recent = weeklyCounts.slice(weeklyCounts.length - half).reduce((sum, n) => sum + n, 0);
    if (prior === 0) {
      return recent === 0 ? 0 : null;
    }
    return Math.round(((recent - prior) / prior) * 100);
  }

  private mostCommonType(
    stats: RecipientVisitsStatsView,
  ): VisitsAnalyticsResult['mostCommonVisitType'] {
    if (stats.typeCounts.length === 0 || stats.totalVisits === 0) {
      return null;
    }
    const top = stats.typeCounts.reduce((best, current) =>
      current.count > best.count ? current : best,
    );
    return {
      visitType: String(top.visitType),
      percent: round1((top.count / stats.totalVisits) * 100),
    };
  }

  private coverage(
    stats: RecipientVisitsStatsView,
    caregiverName: Map<string, string>,
  ): VisitsAnalyticsResult['primaryCaregiverCoverage'] {
    if (stats.caregiverCounts.length === 0 || stats.totalVisits === 0) {
      return null;
    }
    const top = stats.caregiverCounts.reduce((best, current) =>
      current.count > best.count ? current : best,
    );
    return {
      caregiverId: top.caregiverId,
      name: caregiverName.get(top.caregiverId) ?? null,
      visitCount: top.count,
      percent: round1((top.count / stats.totalVisits) * 100),
    };
  }
}

/** Midnight (UTC) of the day the given instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Round to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
