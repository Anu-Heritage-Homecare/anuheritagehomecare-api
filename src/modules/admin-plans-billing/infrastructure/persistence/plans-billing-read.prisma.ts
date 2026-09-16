import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  CareRequestStatus,
  Currency as PrismaCurrency,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CareRequestPageView,
  CareRequestsReadModel,
} from '../../application/ports/care-requests-read.port';
import {
  MonthlyRevenuePointView,
  PlansBillingOverviewView,
  PlansBillingReadModel,
  SubscriptionPageView,
} from '../../application/ports/plans-billing-read.port';
import {
  TransactionPageView,
  TransactionsReadModel,
} from '../../application/ports/transactions-read.port';

/** Number of months shown on the revenue analytics chart, current month included. */
const REVENUE_SERIES_MONTHS = 12;

/**
 * Prisma read model for the Plans and Billing overview. Every query is scoped to a
 * single currency, so the sums it returns are honest within that market. The month
 * series is bucketed in memory from a single bounded payment read.
 */
@Injectable()
export class PlansBillingReadPrisma
  implements PlansBillingReadModel, TransactionsReadModel, CareRequestsReadModel
{
  constructor(private readonly prisma: PrismaService) {}

  async overview(currency: PrismaCurrency, now: Date): Promise<PlansBillingOverviewView> {
    const todayStart = startOfUtcDay(now);
    const monthStart = startOfUtcMonth(now, 0);
    const lastMonthStart = startOfUtcMonth(now, -1);
    const seriesStart = startOfUtcMonth(now, -(REVENUE_SERIES_MONTHS - 1));

    const settled = { status: PaymentStatus.SUCCEEDED, currency };

    const [
      billedToday,
      monthlyRevenue,
      lastMonthRevenue,
      activeSubscriptions,
      pastDueSubscriptions,
      newSubscriptionsThisMonth,
      cancelledThisMonth,
      pendingCareRequests,
      distribution,
      seriesRows,
      flexible,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amountMinor: true },
        where: { ...settled, createdAt: { gte: todayStart } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountMinor: true },
        where: { ...settled, createdAt: { gte: monthStart } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountMinor: true },
        where: { ...settled, createdAt: { gte: lastMonthStart, lt: monthStart } },
      }),
      this.prisma.subscription.count({
        where: { currency, status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.subscription.count({
        where: { currency, status: SubscriptionStatus.PAST_DUE },
      }),
      this.prisma.subscription.count({
        where: { currency, createdAt: { gte: monthStart } },
      }),
      this.prisma.subscription.count({
        where: {
          currency,
          status: SubscriptionStatus.CANCELLED,
          updatedAt: { gte: monthStart },
        },
      }),
      this.prisma.additionalCareRequest.count({
        where: { status: CareRequestStatus.PENDING },
      }),
      this.prisma.subscription.groupBy({
        by: ['planType'],
        where: { currency, status: SubscriptionStatus.ACTIVE },
        _count: { _all: true },
        _sum: { monthlyPriceMinor: true },
        orderBy: { planType: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { ...settled, createdAt: { gte: seriesStart } },
        select: { amountMinor: true, createdAt: true },
      }),
      this.prisma.booking.aggregate({
        _count: { _all: true },
        _sum: { totalMinor: true },
        where: { currency, status: BookingStatus.CONFIRMED, serviceDate: { gte: monthStart } },
      }),
    ]);

    return {
      billedTodayMinor: billedToday._sum.amountMinor ?? 0,
      monthlyRevenueMinor: monthlyRevenue._sum.amountMinor ?? 0,
      lastMonthRevenueMinor: lastMonthRevenue._sum.amountMinor ?? 0,
      activeSubscriptions,
      pastDueSubscriptions,
      newSubscriptionsThisMonth,
      cancelledThisMonth,
      pendingCareRequests,
      distribution: distribution.map((row) => ({
        planType: row.planType,
        activeSubscriptions: row._count._all,
        monthlyRevenueMinor: row._sum.monthlyPriceMinor ?? 0,
      })),
      revenueSeries: bucketByMonth(seriesRows, seriesStart, REVENUE_SERIES_MONTHS),
      flexibleBookingsThisMonth: flexible._count._all,
      flexibleRevenueThisMonthMinor: flexible._sum.totalMinor ?? 0,
    };
  }

  async listSubscriptions(
    currency: PrismaCurrency,
    status: SubscriptionStatus | null,
    page: number,
    pageSize: number,
  ): Promise<SubscriptionPageView> {
    const where = { currency, ...(status === null ? {} : { status }) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
        select: {
          id: true,
          ownerId: true,
          careRecipientId: true,
          planType: true,
          status: true,
          startDate: true,
          monthlyPriceMinor: true,
        },
      }),
    ]);

    const [recipientNames, ownerNames] = await Promise.all([
      this.recipientNames(rows.map((row) => row.careRecipientId)),
      this.ownerNames(rows.map((row) => row.ownerId)),
    ]);

    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        recipientName: recipientNames.get(row.careRecipientId) ?? null,
        accountHolderName: ownerNames.get(row.ownerId) ?? null,
        planType: row.planType,
        status: row.status,
        startDate: row.startDate,
        monthlyPriceMinor: row.monthlyPriceMinor,
      })),
    };
  }

  private async recipientNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.careRecipient.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((row) => [row.id, row.name]));
  }

  private async ownerNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  }

  async listTransactions(
    currency: PrismaCurrency,
    status: PaymentStatus | null,
    page: number,
    pageSize: number,
  ): Promise<TransactionPageView> {
    const where = { currency, ...(status === null ? {} : { status }) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
        select: {
          id: true,
          ownerId: true,
          providerReference: true,
          provider: true,
          payableType: true,
          amountMinor: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const ownerNames = await this.ownerNames(rows.map((row) => row.ownerId));

    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        reference: row.providerReference,
        ownerName: ownerNames.get(row.ownerId) ?? null,
        provider: row.provider,
        payableType: row.payableType,
        amountMinor: row.amountMinor,
        status: row.status,
        createdAt: row.createdAt,
      })),
    };
  }

  async listCareRequests(
    status: CareRequestStatus | null,
    page: number,
    pageSize: number,
  ): Promise<CareRequestPageView> {
    const where = status === null ? {} : { status };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.additionalCareRequest.count({ where }),
      this.prisma.additionalCareRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
        select: {
          id: true,
          ownerId: true,
          careRecipientId: true,
          careType: true,
          requestedDate: true,
          startMinute: true,
          durationMinutes: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const [familyNames, patientNames] = await Promise.all([
      this.ownerNames(rows.map((row) => row.ownerId)),
      this.recipientNames(rows.map((row) => row.careRecipientId)),
    ]);

    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        familyName: familyNames.get(row.ownerId) ?? null,
        patientName: patientNames.get(row.careRecipientId) ?? null,
        careType: row.careType,
        requestedDate: row.requestedDate,
        startMinute: row.startMinute,
        durationMinutes: row.durationMinutes,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
      })),
    };
  }
}

/** Midnight (UTC) of the day the instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** First day (UTC) of the month `offset` months from the instant's month. */
function startOfUtcMonth(value: Date, offset: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1));
}

/**
 * Fold settled payments into `count` consecutive month buckets starting at
 * `seriesStart`. Payments outside the window are ignored (the query already bounds
 * the lower edge). Returns one point per month, oldest first.
 */
function bucketByMonth(
  rows: { amountMinor: number; createdAt: Date }[],
  seriesStart: Date,
  count: number,
): MonthlyRevenuePointView[] {
  const points: MonthlyRevenuePointView[] = [];
  for (let index = 0; index < count; index += 1) {
    points.push({
      monthStart: new Date(
        Date.UTC(seriesStart.getUTCFullYear(), seriesStart.getUTCMonth() + index, 1),
      ),
      totalMinor: 0,
    });
  }
  for (const row of rows) {
    const monthIndex =
      (row.createdAt.getUTCFullYear() - seriesStart.getUTCFullYear()) * 12 +
      (row.createdAt.getUTCMonth() - seriesStart.getUTCMonth());
    if (monthIndex >= 0 && monthIndex < count) {
      points[monthIndex].totalMinor += row.amountMinor;
    }
  }
  return points;
}
