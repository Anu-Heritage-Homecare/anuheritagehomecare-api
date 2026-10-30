import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  BillingActivityResult,
  BillingDashboardResult,
  RecentPaymentResult,
} from '../dto/billing-dashboard.result';
import {
  BILLING_DASHBOARD_READ_MODEL,
  BillingDashboardReadModel,
  BillingDashboardView,
} from '../ports/billing-dashboard-read.port';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The six month revenue trend and eight rows per activity stream match the mockup. */
const TREND_MONTHS = 6;
const FEED_LIMIT = 8;
/** How many merged activity entries the feed returns. */
const ACTIVITY_LIMIT = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface GetBillingDashboardCommand {
  currency: Currency;
}

/**
 * Assemble the admin Billing dashboard for one market: the KPI cards, the six month
 * revenue trend, the outstanding aging analysis, the recent payments table and the
 * recent billing activity feed. Read only; every figure is a single currency sum.
 */
@Injectable()
export class GetBillingDashboardUseCase {
  constructor(
    @Inject(BILLING_DASHBOARD_READ_MODEL) private readonly reads: BillingDashboardReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetBillingDashboardCommand): Promise<BillingDashboardResult> {
    const now = this.clock.now();
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const view = await this.reads.dashboard(prismaCurrency, now, TREND_MONTHS, FEED_LIMIT);

    return {
      currency: String(command.currency),
      generatedAt: now.toISOString(),
      kpis: {
        totalRevenueMinor: view.collectedLifetimeMinor,
        totalRevenueGrowthPercent: percentChange(
          view.paymentsThisMonthMinor,
          view.paymentsLastMonthMinor,
        ),
        outstandingBalanceMinor: view.outstanding.patientDueMinor,
        outstandingInvoiceCount: view.outstanding.invoiceCount,
        overdueAmountMinor: view.overdue.patientDueMinor,
        overdueInvoiceCount: view.overdue.invoiceCount,
        paymentsThisMonthMinor: view.paymentsThisMonthMinor,
        paymentsThisMonthCount: view.paymentsThisMonthCount,
        collectionRatePercent: collectionRate(
          view.collectedLifetimeMinor,
          view.billedLifetimeMinor,
        ),
        collectionRateDeltaPercent: collectionRateDelta(view),
      },
      revenueSeries: view.revenueSeries.map((point) => ({
        label: `${MONTHS[point.monthStart.getUTCMonth()]} ${point.monthStart.getUTCFullYear()}`,
        monthStart: point.monthStart.toISOString(),
        totalMinor: point.totalMinor,
      })),
      outstandingAging: view.aging,
      recentPayments: view.recentPayments.map((row): RecentPaymentResult => ({
        reference: `TXN-${String(row.sequence).padStart(4, '0')}`,
        account: row.accountName,
        amountMinor: row.amountMinor,
        methodLabel: row.methodLabel,
        receivedAt: row.receivedAt.toISOString(),
      })),
      recentActivity: this.buildActivity(view, now),
    };
  }

  /**
   * Merge the three evidenced activity streams (payments, issued invoices, overdue
   * invoices) into one feed, newest first, capped at ACTIVITY_LIMIT.
   */
  private buildActivity(view: BillingDashboardView, now: Date): BillingActivityResult[] {
    const entries: BillingActivityResult[] = [
      ...view.recentPayments.map((row): BillingActivityResult => ({
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        at: row.receivedAt.toISOString(),
        account: row.accountName,
        invoiceNumber: null,
        amountMinor: row.amountMinor,
        daysPastDue: null,
      })),
      ...view.recentInvoices.map((row): BillingActivityResult => ({
        type: 'INVOICE_CREATED',
        title: 'Invoice Created',
        at: row.issuedAt.toISOString(),
        account: row.accountName,
        invoiceNumber: invoiceNumber(row.issuedAt, row.sequence),
        amountMinor: null,
        daysPastDue: null,
      })),
      ...view.overdueInvoices.map((row): BillingActivityResult => ({
        type: 'INVOICE_OVERDUE',
        title: 'Invoice Overdue',
        at: row.dueDate.toISOString(),
        account: row.accountName,
        invoiceNumber: invoiceNumber(row.issuedAt, row.sequence),
        amountMinor: null,
        daysPastDue: daysBetween(row.dueDate, now),
      })),
    ];

    return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, ACTIVITY_LIMIT);
  }
}

/** Invoice number matching the per recipient Billing view: INV-<year>-<sequence>. */
function invoiceNumber(issuedAt: Date, sequence: number): string {
  return `INV-${issuedAt.getUTCFullYear()}-${String(sequence).padStart(3, '0')}`;
}

/** Whole days from `from` up to `to`, never negative. */
function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY));
}

/** Month over month percent change, or null when the base is zero. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return round1(((current - previous) / previous) * 100);
}

/** Collected over billed, as a percentage capped at 100; null when nothing billed. */
function collectionRate(collectedMinor: number, billedMinor: number): number | null {
  if (billedMinor <= 0) {
    return null;
  }
  return round1(Math.min(100, (collectedMinor / billedMinor) * 100));
}

/** This month's collection ratio minus last month's, in points; null when incomputable. */
function collectionRateDelta(view: BillingDashboardView): number | null {
  const thisMonth = collectionRate(view.collectedThisMonthMinor, view.billedThisMonthMinor);
  const lastMonth = collectionRate(view.collectedLastMonthMinor, view.billedLastMonthMinor);
  if (thisMonth === null || lastMonth === null) {
    return null;
  }
  return round1(thisMonth - lastMonth);
}

/** Round to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
