import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AgingBucket,
  AgingBucketView,
  CollectionMethodShareView,
  FinancialReportFilter,
  FinancialReportView,
  FinancialReportsReadModel,
  MonthlyRevenuePointView,
} from '../../application/ports/financial-reports-read.port';

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_MONTHS = 6;
/** Payments with no captured method fall under this label. */
const UNKNOWN_METHOD = 'Other';

interface InvoiceRow {
  amountMinor: number;
  insuranceCoveredMinor: number;
  issuedAt: Date;
  status: string;
}

interface PaymentRow {
  amountMinor: number;
  methodLabel: string | null;
  receivedAt: Date;
}

/**
 * Prisma read model for the Financial Reports screen. Loads the invoices, payments and
 * write off adjustments for one market (optionally one branch), then derives every
 * figure in memory: the KPI sums, the 6 month billed trend, the payment method split
 * and the aging of the outstanding balance.
 *
 * shortcut: in memory aggregation over the market's invoicing rows, fine for an agency's
 * volume; move the sums into dated aggregate queries if a market reaches millions of rows.
 */
@Injectable()
export class FinancialReportsReadPrisma implements FinancialReportsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async report(filter: FinancialReportFilter): Promise<FinancialReportView> {
    const scope = await this.resolveBranchScope(filter.branch);

    const recipientWhere = scope === null ? {} : { careRecipientId: { in: scope.recipientIds } };
    const entryWhere = scope === null ? {} : { billingAccountId: { in: scope.entryIds } };

    const [invoices, payments, writeOffs] = await Promise.all([
      this.prisma.recipientInvoice.findMany({
        where: { currency: filter.currency, ...recipientWhere },
        select: { amountMinor: true, insuranceCoveredMinor: true, issuedAt: true, status: true },
      }),
      this.prisma.recipientInvoicePayment.findMany({
        where: { currency: filter.currency, ...recipientWhere },
        select: { amountMinor: true, methodLabel: true, receivedAt: true },
      }),
      this.prisma.accountAdjustment.findMany({
        where: {
          currency: filter.currency,
          category: 'WRITE_OFF',
          status: 'COMPLETED',
          ...entryWhere,
        },
        select: { amountMinor: true, createdAt: true },
      }),
    ]);

    const inWindow = (at: Date): boolean =>
      at.getTime() >= filter.from.getTime() && at.getTime() < filter.to.getTime();
    const inPrevious = (at: Date): boolean =>
      at.getTime() >= filter.previousFrom.getTime() && at.getTime() < filter.previousTo.getTime();

    let totalRevenueMinor = 0;
    let previousRevenueMinor = 0;
    let outstandingMinor = 0;
    let pendingInvoiceCount = 0;
    for (const invoice of invoices) {
      const due = patientDue(invoice);
      if (inWindow(invoice.issuedAt)) {
        totalRevenueMinor += due;
      }
      if (inPrevious(invoice.issuedAt)) {
        previousRevenueMinor += due;
      }
      if (invoice.status === 'PENDING') {
        outstandingMinor += due;
        pendingInvoiceCount += 1;
      }
    }

    const collectionsMinor = payments
      .filter((p) => inWindow(p.receivedAt))
      .reduce((sum, p) => sum + p.amountMinor, 0);

    const writeOffsMinor = writeOffs
      .filter((w) => inWindow(w.createdAt))
      .reduce((sum, w) => sum + w.amountMinor, 0);

    return {
      currency: filter.currency,
      kpis: {
        totalRevenueMinor,
        previousRevenueMinor,
        collectionsMinor,
        outstandingMinor,
        pendingInvoiceCount,
        writeOffsMinor,
      },
      monthlyRevenue: buildMonthlyRevenue(invoices, filter.now),
      collectionsByMethod: buildMethodShares(payments.filter((p) => inWindow(p.receivedAt))),
      aging: buildAging(invoices, filter.now),
    };
  }

  /**
   * The care recipient ids and billing account (directory entry) ids within a branch, or
   * null when no branch is set (every account in the market is in scope).
   */
  private async resolveBranchScope(
    branch: string | null,
  ): Promise<{ recipientIds: string[]; entryIds: string[] } | null> {
    if (branch === null) {
      return null;
    }
    const entries = await this.prisma.familyDirectoryEntry.findMany({
      where: { branch },
      select: { id: true, userId: true, primaryRecipientId: true },
    });
    const ownerIds = entries.map((e) => e.userId).filter((id): id is string => id !== null);
    const owned =
      ownerIds.length === 0
        ? []
        : await this.prisma.careRecipient.findMany({
            where: { ownerId: { in: ownerIds } },
            select: { id: true },
          });
    const recipientIds = [
      ...new Set([
        ...owned.map((r) => r.id),
        ...entries.map((e) => e.primaryRecipientId).filter((id): id is string => id !== null),
      ]),
    ];
    return { recipientIds, entryIds: entries.map((e) => e.id) };
  }
}

/** Patient due is the billed amount net of insurance; never negative. */
function patientDue(invoice: { amountMinor: number; insuranceCoveredMinor: number }): number {
  return Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
}

/** First day (UTC) of the month `offset` months from the instant's month. */
function startOfUtcMonth(value: Date, offset: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1));
}

/** Billed patient due folded into the trailing 6 month buckets, oldest first. */
function buildMonthlyRevenue(invoices: InvoiceRow[], now: Date): MonthlyRevenuePointView[] {
  const seriesStart = startOfUtcMonth(now, -(TREND_MONTHS - 1));
  const points = Array.from({ length: TREND_MONTHS }, (_unused, index) => ({
    monthStart: startOfUtcMonth(seriesStart, index),
    revenueMinor: 0,
  }));
  for (const invoice of invoices) {
    const index =
      (invoice.issuedAt.getUTCFullYear() - seriesStart.getUTCFullYear()) * 12 +
      (invoice.issuedAt.getUTCMonth() - seriesStart.getUTCMonth());
    if (index >= 0 && index < TREND_MONTHS) {
      points[index].revenueMinor += patientDue(invoice);
    }
  }
  return points;
}

/** Payment volume grouped by method label, largest share first. */
function buildMethodShares(payments: PaymentRow[]): CollectionMethodShareView[] {
  const byMethod = new Map<string, number>();
  for (const payment of payments) {
    const method = payment.methodLabel ?? UNKNOWN_METHOD;
    byMethod.set(method, (byMethod.get(method) ?? 0) + payment.amountMinor);
  }
  return [...byMethod.entries()]
    .map(([method, amountMinor]) => ({ method, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

/** Split the outstanding (pending) balance into the four aging buckets by receivable age. */
function buildAging(invoices: InvoiceRow[], now: Date): AgingBucketView[] {
  const buckets: Record<AgingBucket, { invoiceCount: number; totalMinor: number }> = {
    CURRENT: { invoiceCount: 0, totalMinor: 0 },
    DAYS_31_60: { invoiceCount: 0, totalMinor: 0 },
    DAYS_61_90: { invoiceCount: 0, totalMinor: 0 },
    DAYS_90_PLUS: { invoiceCount: 0, totalMinor: 0 },
  };
  for (const invoice of invoices) {
    if (invoice.status !== 'PENDING') {
      continue;
    }
    const ageDays = (now.getTime() - invoice.issuedAt.getTime()) / DAY_MS;
    const key = agingBucketFor(ageDays);
    buckets[key].invoiceCount += 1;
    buckets[key].totalMinor += patientDue(invoice);
  }
  return (Object.keys(buckets) as AgingBucket[]).map((bucket) => ({
    bucket,
    invoiceCount: buckets[bucket].invoiceCount,
    totalMinor: buckets[bucket].totalMinor,
  }));
}

function agingBucketFor(ageDays: number): AgingBucket {
  if (ageDays <= 30) {
    return 'CURRENT';
  }
  if (ageDays <= 60) {
    return 'DAYS_31_60';
  }
  if (ageDays <= 90) {
    return 'DAYS_61_90';
  }
  return 'DAYS_90_PLUS';
}
