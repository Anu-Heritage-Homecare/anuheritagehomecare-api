import { Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency, RecipientInvoiceStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AgingBucketsView,
  AmountAndCountView,
  BillingDashboardReadModel,
  BillingDashboardView,
} from '../../application/ports/billing-dashboard-read.port';

/** _sum shape returned by the invoice aggregates (both columns may be null when empty). */
interface InvoiceSum {
  _sum: { amountMinor: number | null; insuranceCoveredMinor: number | null };
}

/**
 * Prisma read model for the admin Billing dashboard. Aggregates the recipient
 * invoicing tables for one market (currency): every figure is a single currency sum
 * over indexed columns, never a cross currency total and never a per invoice loop.
 */
@Injectable()
export class BillingDashboardReadPrisma implements BillingDashboardReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(
    currency: PrismaCurrency,
    now: Date,
    months: number,
    feedLimit: number,
  ): Promise<BillingDashboardView> {
    const monthStart = startOfUtcMonth(now, 0);
    const lastMonthStart = startOfUtcMonth(now, -1);
    const seriesStart = startOfUtcMonth(now, -(months - 1));
    const cut30 = daysAgo(now, 30);
    const cut60 = daysAgo(now, 60);
    const cut90 = daysAgo(now, 90);

    const invoiceSum = { amountMinor: true, insuranceCoveredMinor: true } as const;
    const pending = { currency, status: RecipientInvoiceStatus.PENDING };

    const [
      collectedLifetime,
      paymentsThisMonth,
      paymentsLastMonth,
      billedLifetime,
      billedThisMonth,
      billedLastMonth,
      outstanding,
      overdue,
      aging0to30,
      aging31to60,
      aging61to90,
      aging90Plus,
      trendRows,
      recentPayments,
      recentInvoices,
      overdueInvoices,
    ] = await Promise.all([
      this.prisma.recipientInvoicePayment.aggregate({
        where: { currency },
        _sum: { amountMinor: true },
      }),
      this.prisma.recipientInvoicePayment.aggregate({
        where: { currency, receivedAt: { gte: monthStart } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.recipientInvoicePayment.aggregate({
        where: { currency, receivedAt: { gte: lastMonthStart, lt: monthStart } },
        _sum: { amountMinor: true },
      }),
      this.prisma.recipientInvoice.aggregate({ where: { currency }, _sum: invoiceSum }),
      this.prisma.recipientInvoice.aggregate({
        where: { currency, issuedAt: { gte: monthStart } },
        _sum: invoiceSum,
      }),
      this.prisma.recipientInvoice.aggregate({
        where: { currency, issuedAt: { gte: lastMonthStart, lt: monthStart } },
        _sum: invoiceSum,
      }),
      this.prisma.recipientInvoice.aggregate({ where: pending, _sum: invoiceSum, _count: true }),
      this.prisma.recipientInvoice.aggregate({
        where: { ...pending, dueDate: { lt: now } },
        _sum: invoiceSum,
        _count: true,
      }),
      this.prisma.recipientInvoice.aggregate({
        where: { ...pending, issuedAt: { gte: cut30 } },
        _sum: invoiceSum,
      }),
      this.prisma.recipientInvoice.aggregate({
        where: { ...pending, issuedAt: { gte: cut60, lt: cut30 } },
        _sum: invoiceSum,
      }),
      this.prisma.recipientInvoice.aggregate({
        where: { ...pending, issuedAt: { gte: cut90, lt: cut60 } },
        _sum: invoiceSum,
      }),
      this.prisma.recipientInvoice.aggregate({
        where: { ...pending, issuedAt: { lt: cut90 } },
        _sum: invoiceSum,
      }),
      this.prisma.recipientInvoicePayment.findMany({
        where: { currency, receivedAt: { gte: seriesStart } },
        select: { amountMinor: true, receivedAt: true },
      }),
      this.prisma.recipientInvoicePayment.findMany({
        where: { currency },
        orderBy: { receivedAt: 'desc' },
        take: feedLimit,
        select: {
          sequence: true,
          amountMinor: true,
          methodLabel: true,
          receivedAt: true,
          careRecipient: { select: { name: true } },
        },
      }),
      this.prisma.recipientInvoice.findMany({
        where: { currency },
        orderBy: { issuedAt: 'desc' },
        take: feedLimit,
        select: { sequence: true, issuedAt: true, careRecipient: { select: { name: true } } },
      }),
      this.prisma.recipientInvoice.findMany({
        where: { ...pending, dueDate: { lt: now } },
        orderBy: { dueDate: 'asc' },
        take: feedLimit,
        select: {
          sequence: true,
          issuedAt: true,
          dueDate: true,
          careRecipient: { select: { name: true } },
        },
      }),
    ]);

    const thisMonthMinor = paymentsThisMonth._sum.amountMinor ?? 0;
    const lastMonthMinor = paymentsLastMonth._sum.amountMinor ?? 0;

    const aging: AgingBucketsView = {
      days0to30Minor: patientDue(aging0to30),
      days31to60Minor: patientDue(aging31to60),
      days61to90Minor: patientDue(aging61to90),
      days90PlusMinor: patientDue(aging90Plus),
    };

    return {
      collectedLifetimeMinor: collectedLifetime._sum.amountMinor ?? 0,
      paymentsThisMonthMinor: thisMonthMinor,
      paymentsThisMonthCount: paymentsThisMonth._count,
      paymentsLastMonthMinor: lastMonthMinor,
      billedLifetimeMinor: patientDue(billedLifetime),
      billedThisMonthMinor: patientDue(billedThisMonth),
      collectedThisMonthMinor: thisMonthMinor,
      billedLastMonthMinor: patientDue(billedLastMonth),
      collectedLastMonthMinor: lastMonthMinor,
      outstanding: amountAndCount(outstanding),
      overdue: amountAndCount(overdue),
      aging,
      revenueSeries: bucketByMonth(trendRows, seriesStart, months),
      recentPayments: recentPayments.map((row) => ({
        sequence: row.sequence,
        accountName: row.careRecipient.name,
        amountMinor: row.amountMinor,
        methodLabel: row.methodLabel,
        receivedAt: row.receivedAt,
      })),
      recentInvoices: recentInvoices.map((row) => ({
        sequence: row.sequence,
        issuedAt: row.issuedAt,
        accountName: row.careRecipient.name,
      })),
      overdueInvoices: overdueInvoices
        .filter((row): row is typeof row & { dueDate: Date } => row.dueDate !== null)
        .map((row) => ({
          sequence: row.sequence,
          issuedAt: row.issuedAt,
          dueDate: row.dueDate,
          accountName: row.careRecipient.name,
        })),
    };
  }
}

/** Patient due is the billed amount net of insurance; never negative. */
function patientDue(result: InvoiceSum): number {
  return Math.max(0, (result._sum.amountMinor ?? 0) - (result._sum.insuranceCoveredMinor ?? 0));
}

/** Pair an invoice aggregate's patient due sum with its row count. */
function amountAndCount(result: InvoiceSum & { _count: number }): AmountAndCountView {
  return { patientDueMinor: patientDue(result), invoiceCount: result._count };
}

/** First day (UTC) of the month `offset` months from the instant's month. */
function startOfUtcMonth(value: Date, offset: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1));
}

/** The instant `days` days before `value`. */
function daysAgo(value: Date, days: number): Date {
  return new Date(value.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Fold receipts into `count` consecutive month buckets starting at `seriesStart`,
 * keyed on when the payment was received. Rows outside the window are ignored (the
 * query already bounds the lower edge). One point per month, oldest first.
 */
function bucketByMonth(
  rows: { amountMinor: number; receivedAt: Date }[],
  seriesStart: Date,
  count: number,
): { monthStart: Date; totalMinor: number }[] {
  const points = Array.from({ length: count }, (_unused, index) => ({
    monthStart: startOfUtcMonth(seriesStart, index),
    totalMinor: 0,
  }));
  for (const row of rows) {
    const monthIndex =
      (row.receivedAt.getUTCFullYear() - seriesStart.getUTCFullYear()) * 12 +
      (row.receivedAt.getUTCMonth() - seriesStart.getUTCMonth());
    if (monthIndex >= 0 && monthIndex < count) {
      points[monthIndex].totalMinor += row.amountMinor;
    }
  }
  return points;
}
