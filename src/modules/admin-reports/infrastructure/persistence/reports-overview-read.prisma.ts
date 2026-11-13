import { Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency, RecipientInvoiceStatus, VisitStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  MonthlyRevenueBucket,
  MonthlyVisitBucket,
  ReportsAggregateQuery,
  ReportsAggregateView,
  ReportsOverviewReadModel,
  VisitAggregate,
} from '../../application/ports/reports-overview-read.port';

const ON_TIME_GRACE_MINUTES = 5;
const DEFAULT_WEEKLY_HOURS = 40;
const TREND_MONTHS = 6;
const MINUTE_MS = 60 * 1000;
const EXCLUDED_INVOICE_STATUSES: RecipientInvoiceStatus[] = ['CANCELLED', 'WRITTEN_OFF'];

/** The minimal visit shape the aggregates need. */
interface VisitRow {
  status: VisitStatus;
  scheduledDate: Date;
  startMinute: number;
  clockInAt: Date | null;
  clockOutAt: Date | null;
}

/**
 * Prisma read model for the admin Reports Overview. Operational, workforce and
 * satisfaction figures are org wide (visits and ratings carry no currency); only the
 * financial figures are scoped to the selected market. Trends load the last six months
 * of visits and payments once and bucket them in memory.
 *
 * shortcut: scans the trend window of visits and payments per request, fine for an
 * agency's hundreds to low thousands; push the bucketing into SQL when volumes grow.
 */
@Injectable()
export class ReportsOverviewReadPrisma implements ReportsOverviewReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate(query: ReportsAggregateQuery): Promise<ReportsAggregateView> {
    const { currency, from, to, now } = query;
    const monthStart = startOfMonth(now);
    const trendStart = addMonths(monthStart, -(TREND_MONTHS - 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    const [
      rangeVisits,
      trendVisits,
      ratingGroups,
      activeCaregivers,
      expiredCertCaregivers,
      revenueRange,
      revenueYtd,
      revenueMonth,
      trendPayments,
      billed,
      outstanding,
    ] = await Promise.all([
      this.visitRows(from, to),
      this.visitRows(trendStart, now),
      this.prisma.careRating.groupBy({
        by: ['score'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.caregiverProfile.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
        select: { userId: true, maxHoursPerWeek: true },
      }),
      this.expiredCertCaregiverIds(now),
      this.collectedRevenue(currency, from, to),
      this.collectedRevenue(currency, yearStart, now),
      this.collectedRevenue(currency, monthStart, now),
      this.prisma.recipientInvoicePayment.findMany({
        where: {
          currency,
          creditAdjustmentId: null,
          receivedAt: { gte: trendStart, lte: now },
        },
        select: { amountMinor: true, refundedAmountMinor: true, receivedAt: true },
      }),
      this.prisma.recipientInvoice.aggregate({
        where: {
          currency,
          status: { notIn: EXCLUDED_INVOICE_STATUSES },
          issuedAt: { gte: from, lte: to },
        },
        _sum: { amountMinor: true, insuranceCoveredMinor: true },
        _count: { _all: true },
      }),
      this.prisma.recipientInvoice.aggregate({
        where: { currency, status: 'PENDING' },
        _sum: { amountMinor: true, insuranceCoveredMinor: true },
      }),
    ]);

    const activeIds = new Set(activeCaregivers.map((c) => c.userId));
    const weeklyCapacityHours = activeCaregivers.reduce(
      (sum, c) => sum + (c.maxHoursPerWeek ?? DEFAULT_WEEKLY_HOURS),
      0,
    );

    const ratingCounts = [0, 0, 0, 0, 0];
    let ratingSum = 0;
    let ratingCount = 0;
    for (const group of ratingGroups) {
      if (group.score >= 1 && group.score <= 5) {
        const count = group._count._all;
        ratingCounts[group.score - 1] = count;
        ratingSum += group.score * count;
        ratingCount += count;
      }
    }

    const monthly = this.monthlyVisitBuckets(trendVisits, trendStart);
    const monthlyRevenue = this.monthlyRevenueBuckets(trendPayments, trendStart);

    return {
      currency,
      range: buildVisitAggregate(rangeVisits),
      visitsThisMonth: monthly[monthly.length - 1]?.visits.total ?? 0,
      monthly,
      ratingCounts,
      ratingSum,
      ratingCount,
      activeCaregivers: activeCaregivers.length,
      weeklyCapacityHours,
      caregiversWithExpiredCerts: expiredCertCaregivers.filter((id) => activeIds.has(id)).length,
      revenueMinor: revenueRange,
      ytdRevenueMinor: revenueYtd,
      currentMonthRevenueMinor: revenueMonth,
      monthlyRevenue,
      billedMinor: patientDue(billed._sum.amountMinor, billed._sum.insuranceCoveredMinor),
      invoiceCount: billed._count._all,
      outstandingMinor: patientDue(
        outstanding._sum.amountMinor,
        outstanding._sum.insuranceCoveredMinor,
      ),
    };
  }

  private async visitRows(from: Date, to: Date): Promise<VisitRow[]> {
    return this.prisma.visit.findMany({
      where: { scheduledDate: { gte: startOfDay(from), lte: to } },
      select: {
        status: true,
        scheduledDate: true,
        startMinute: true,
        clockInAt: true,
        clockOutAt: true,
      },
    });
  }

  /** The user ids of caregivers carrying at least one expired certification. */
  private async expiredCertCaregiverIds(now: Date): Promise<string[]> {
    const rows = await this.prisma.certification.findMany({
      where: { expiresAt: { lt: now } },
      select: { caregiverId: true },
      distinct: ['caregiverId'],
    });
    return rows.map((r) => r.caregiverId);
  }

  /** Collected revenue (payments net of refunds, excluding credit settlements) in a window. */
  private async collectedRevenue(currency: PrismaCurrency, from: Date, to: Date): Promise<number> {
    const sum = await this.prisma.recipientInvoicePayment.aggregate({
      where: { currency, creditAdjustmentId: null, receivedAt: { gte: from, lte: to } },
      _sum: { amountMinor: true, refundedAmountMinor: true },
    });
    return (sum._sum.amountMinor ?? 0) - (sum._sum.refundedAmountMinor ?? 0);
  }

  private monthlyVisitBuckets(visits: VisitRow[], trendStart: Date): MonthlyVisitBucket[] {
    const rowsByMonth: VisitRow[][] = Array.from({ length: TREND_MONTHS }, () => []);
    for (const visit of visits) {
      const index = monthIndex(visit.scheduledDate, trendStart);
      if (index >= 0 && index < TREND_MONTHS) {
        rowsByMonth[index].push(visit);
      }
    }
    return rowsByMonth.map((rows, index) => ({
      monthStart: addMonths(trendStart, index),
      visits: buildVisitAggregate(rows),
    }));
  }

  private monthlyRevenueBuckets(
    payments: { amountMinor: number; refundedAmountMinor: number; receivedAt: Date }[],
    trendStart: Date,
  ): MonthlyRevenueBucket[] {
    const totals = new Array<number>(TREND_MONTHS).fill(0);
    for (const payment of payments) {
      const index = monthIndex(payment.receivedAt, trendStart);
      if (index >= 0 && index < TREND_MONTHS) {
        totals[index] += payment.amountMinor - payment.refundedAmountMinor;
      }
    }
    return totals.map((revenueMinor, index) => ({
      monthStart: addMonths(trendStart, index),
      revenueMinor,
    }));
  }
}

/** Patient due is the invoice amount net of the insurance covered portion, floored at zero. */
function patientDue(amountMinor: number | null, insuranceCoveredMinor: number | null): number {
  return Math.max(0, (amountMinor ?? 0) - (insuranceCoveredMinor ?? 0));
}

function buildVisitAggregate(visits: VisitRow[]): VisitAggregate {
  const aggregate: VisitAggregate = {
    total: visits.length,
    completed: 0,
    cancelled: 0,
    missed: 0,
    started: 0,
    onTime: 0,
    loggedSeconds: 0,
    durationCount: 0,
  };
  for (const visit of visits) {
    if (visit.status === 'COMPLETED') {
      aggregate.completed += 1;
      if (visit.clockInAt !== null && visit.clockOutAt !== null) {
        aggregate.loggedSeconds += Math.max(
          0,
          (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 1000,
        );
        aggregate.durationCount += 1;
      }
    } else if (visit.status === 'CANCELLED') {
      aggregate.cancelled += 1;
    } else if (visit.status === 'MISSED') {
      aggregate.missed += 1;
    }
    if (visit.clockInAt !== null) {
      aggregate.started += 1;
      const scheduledStart = visit.scheduledDate.getTime() + visit.startMinute * MINUTE_MS;
      if (visit.clockInAt.getTime() <= scheduledStart + ON_TIME_GRACE_MINUTES * MINUTE_MS) {
        aggregate.onTime += 1;
      }
    }
  }
  return aggregate;
}

/** The zero based month offset of a date from the trend start, or negative when before it. */
function monthIndex(date: Date, trendStart: Date): number {
  return (
    (date.getUTCFullYear() - trendStart.getUTCFullYear()) * 12 +
    (date.getUTCMonth() - trendStart.getUTCMonth())
  );
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}
