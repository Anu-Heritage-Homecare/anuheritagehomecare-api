import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { ReportsOverviewResult } from '../dto/reports-overview.result';
import {
  GENERATED_REPORT_REPOSITORY,
  GeneratedReportRepository,
} from '../../domain/generated-report.repository';
import {
  REPORTS_OVERVIEW_READ_MODEL,
  ReportsOverviewReadModel,
  VisitAggregate,
} from '../ports/reports-overview-read.port';

const DEFAULT_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const SECONDS_PER_HOUR = 3600;
const RECENT_REPORTS_LIMIT = 5;

export interface GetReportsOverviewCommand {
  currency: Currency;
  from: Date | null;
  to: Date | null;
}

/**
 * Assemble the admin Reports Overview for one market: the KPI strip, the six month
 * performance and revenue trends, the operational, workforce and financial summary
 * cards, the client satisfaction breakdown and the recent report activity feed. All
 * money is for the single selected market, since figures cannot cross currencies.
 */
@Injectable()
export class GetReportsOverviewUseCase {
  constructor(
    @Inject(REPORTS_OVERVIEW_READ_MODEL) private readonly reads: ReportsOverviewReadModel,
    @Inject(GENERATED_REPORT_REPOSITORY) private readonly reports: GeneratedReportRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetReportsOverviewCommand): Promise<ReportsOverviewResult> {
    const now = this.clock.now();
    const to = command.to ?? now;
    const from = command.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [view, recent] = await Promise.all([
      this.reads.aggregate({ currency: prismaCurrency, from, to, now }),
      this.reports.listRecent(RECENT_REPORTS_LIMIT),
    ]);

    const rangeDays = Math.max(1, (to.getTime() - from.getTime()) / DAY_MS);
    const capacityHours = capacityForDays(view.weeklyCapacityHours, rangeDays);
    const avgRating = view.ratingCount === 0 ? null : round1(view.ratingSum / view.ratingCount);

    return {
      currency: view.currency,
      from: from.toISOString(),
      to: to.toISOString(),
      kpis: {
        totalVisits: view.range.total,
        caregiverUtilizationPercent: utilization(view.range.loggedSeconds, capacityHours),
        revenueMinor: view.revenueMinor,
        clientSatisfactionAvg: avgRating,
        visitCompletionPercent: completion(view.range),
        outstandingMinor: view.outstandingMinor,
      },
      monthlyPerformance: view.monthly.map((bucket) => ({
        monthStart: bucket.monthStart.toISOString(),
        completionPercent: completion(bucket.visits),
        utilizationPercent: utilization(
          bucket.visits.loggedSeconds,
          capacityForDays(view.weeklyCapacityHours, daysInMonth(bucket.monthStart)),
        ),
      })),
      revenueOverview: {
        ytdRevenueMinor: view.ytdRevenueMinor,
        monthly: view.monthlyRevenue.map((bucket) => ({
          monthStart: bucket.monthStart.toISOString(),
          revenueMinor: bucket.revenueMinor,
        })),
      },
      operationalPerformance: {
        visitsThisMonth: view.visitsThisMonth,
        avgVisitDurationMinutes:
          view.range.durationCount === 0
            ? null
            : Math.round(view.range.loggedSeconds / view.range.durationCount / 60),
        onTimeRatePercent: pct(view.range.onTime, view.range.started),
        cancellationRatePercent: pct(view.range.cancelled, view.range.total),
      },
      workforceSummary: {
        activeCaregivers: view.activeCaregivers,
        avgRating,
        trainingCompliancePercent: pct(
          view.activeCaregivers - view.caregiversWithExpiredCerts,
          view.activeCaregivers,
        ),
        attendanceRatePercent: pct(view.range.total - view.range.missed, view.range.total),
      },
      financialSummary: {
        monthlyRevenueMinor: view.currentMonthRevenueMinor,
        collectionRatePercent: pct(view.revenueMinor, view.billedMinor),
        avgInvoiceMinor:
          view.invoiceCount === 0 ? null : Math.round(view.billedMinor / view.invoiceCount),
        outstandingMinor: view.outstandingMinor,
      },
      satisfactionBreakdown: [1, 2, 3, 4, 5].map((score) => {
        const count = view.ratingCounts[score - 1] ?? 0;
        return {
          score,
          count,
          percent: view.ratingCount === 0 ? 0 : round1((count / view.ratingCount) * 100),
        };
      }),
      recentReports: recent.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        format: row.format,
        generatedAt: row.generatedAt.toISOString(),
        generatedByLabel: row.generatedByLabel,
      })),
    };
  }
}

/** Completion over the visits that were meant to happen (total less those cancelled). */
function completion(visits: VisitAggregate): number | null {
  return pct(visits.completed, visits.total - visits.cancelled);
}

/** Worked hours over available capacity hours, as a percentage. */
function utilization(loggedSeconds: number, capacityHours: number): number | null {
  if (capacityHours <= 0) {
    return null;
  }
  return round1((loggedSeconds / SECONDS_PER_HOUR / capacityHours) * 100);
}

function capacityForDays(weeklyCapacityHours: number, days: number): number {
  return (weeklyCapacityHours * days) / 7;
}

function daysInMonth(monthStart: Date): number {
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

/** A part over a whole as a percentage (1 dp), null when the whole is zero. */
function pct(part: number, whole: number): number | null {
  if (whole <= 0) {
    return null;
  }
  return round1((part / whole) * 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
