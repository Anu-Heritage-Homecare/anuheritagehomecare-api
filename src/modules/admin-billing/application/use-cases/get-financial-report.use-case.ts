import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  AgingBucketResult,
  CollectionMethodShareResult,
  FinancialReportResult,
} from '../dto/financial-report.result';
import {
  FINANCIAL_REPORTS_READ_MODEL,
  FinancialReportsReadModel,
  ReportComparison,
} from '../ports/financial-reports-read.port';

const DEFAULT_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetFinancialReportCommand {
  currency: Currency;
  from: Date | null;
  to: Date | null;
  branch: string | null;
  comparison: ReportComparison;
}

/** Assemble the Financial Reports screen: KPIs with deltas, the trend, methods and aging. */
@Injectable()
export class GetFinancialReportUseCase {
  constructor(
    @Inject(FINANCIAL_REPORTS_READ_MODEL) private readonly reads: FinancialReportsReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetFinancialReportCommand): Promise<FinancialReportResult> {
    const now = this.clock.now();
    const to = command.to ?? now;
    const from = command.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
    const { previousFrom, previousTo } = comparisonWindow(from, to, command.comparison);
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const view = await this.reads.report({
      currency: prismaCurrency,
      from,
      to,
      previousFrom,
      previousTo,
      branch: command.branch,
      now,
    });

    const k = view.kpis;
    const outstandingTotal = view.aging.reduce((sum, bucket) => sum + bucket.totalMinor, 0);
    const methodTotal = view.collectionsByMethod.reduce((sum, m) => sum + m.amountMinor, 0);

    return {
      currency: view.currency,
      from: from.toISOString(),
      to: to.toISOString(),
      branch: command.branch,
      comparison: command.comparison,
      kpis: {
        totalRevenueMinor: k.totalRevenueMinor,
        revenueDeltaPercent: percentChange(k.totalRevenueMinor, k.previousRevenueMinor),
        collectionsMinor: k.collectionsMinor,
        collectionRatePercent: ratePercent(k.collectionsMinor, k.totalRevenueMinor),
        outstandingMinor: k.outstandingMinor,
        pendingInvoiceCount: k.pendingInvoiceCount,
        writeOffsMinor: k.writeOffsMinor,
        lossRatePercent: ratePercent(k.writeOffsMinor, k.totalRevenueMinor),
      },
      monthlyRevenue: view.monthlyRevenue.map((point) => ({
        monthStart: point.monthStart.toISOString(),
        revenueMinor: point.revenueMinor,
      })),
      collectionsByMethod: view.collectionsByMethod.map((m): CollectionMethodShareResult => ({
        method: m.method,
        amountMinor: m.amountMinor,
        sharePercent: methodTotal === 0 ? 0 : round1((m.amountMinor / methodTotal) * 100),
      })),
      aging: view.aging.map((bucket): AgingBucketResult => ({
        bucket: bucket.bucket,
        invoiceCount: bucket.invoiceCount,
        totalMinor: bucket.totalMinor,
        percent: outstandingTotal === 0 ? 0 : round1((bucket.totalMinor / outstandingTotal) * 100),
      })),
    };
  }
}

/** The comparison window of equal length: the period just before, or a year earlier. */
function comparisonWindow(
  from: Date,
  to: Date,
  comparison: ReportComparison,
): { previousFrom: Date; previousTo: Date } {
  if (comparison === 'PREVIOUS_YEAR') {
    return { previousFrom: shiftYears(from, -1), previousTo: shiftYears(to, -1) };
  }
  const length = to.getTime() - from.getTime();
  return { previousFrom: new Date(from.getTime() - length), previousTo: from };
}

function shiftYears(value: Date, years: number): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear() + years,
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    ),
  );
}

/** Percentage change from a baseline, null when the baseline was zero. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return round1(((current - previous) / previous) * 100);
}

/** A part over a whole as a percentage, null when the whole was zero. */
function ratePercent(part: number, whole: number): number | null {
  if (whole === 0) {
    return null;
  }
  return round1((part / whole) * 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
