import { Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  RecipientInvoiceStatus as PrismaInvoiceStatus,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { InvoiceStatus } from '@modules/recipient-billing/domain/invoice-status.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  BillingSummaryView,
  InvoicePageView,
  InvoiceRowView,
  PaymentRowView,
  RecipientBillingReadModel,
  ServiceBreakdownRowView,
} from '../../application/ports/recipient-billing-read.port';

const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  USD: Currency.UnitedStatesDollar,
  NGN: Currency.NigerianNaira,
};

const TO_DOMAIN_STATUS: Record<PrismaInvoiceStatus, InvoiceStatus> = {
  PENDING: InvoiceStatus.Pending,
  PAID: InvoiceStatus.Paid,
};

/** Prisma read model over the recipient billing tables for the admin Billing screen. */
@Injectable()
export class RecipientBillingReadPrisma implements RecipientBillingReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices(
    recipientId: string,
    page: number,
    pageSize: number,
  ): Promise<InvoicePageView> {
    const where = { careRecipientId: recipientId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.recipientInvoice.count({ where }),
      this.prisma.recipientInvoice.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
      }),
    ]);
    return { total, rows: rows.map((row) => this.toRow(row)) };
  }

  async summary(
    recipientId: string,
    monthStart: Date,
    lastMonthStart: Date,
    now: Date,
  ): Promise<BillingSummaryView> {
    const scoped = { careRecipientId: recipientId };
    const [thisMonth, lastMonth, pending, earliest, lastPayment, overdueCount, anyInvoice] =
      await Promise.all([
        this.prisma.recipientInvoice.aggregate({
          where: { ...scoped, issuedAt: { gte: monthStart } },
          _sum: { amountMinor: true },
        }),
        this.prisma.recipientInvoice.aggregate({
          where: { ...scoped, issuedAt: { gte: lastMonthStart, lt: monthStart } },
          _sum: { amountMinor: true },
        }),
        this.prisma.recipientInvoice.aggregate({
          where: { ...scoped, status: PrismaInvoiceStatus.PENDING },
          _sum: { amountMinor: true, insuranceCoveredMinor: true },
        }),
        this.prisma.recipientInvoice.findFirst({
          where: { ...scoped, status: PrismaInvoiceStatus.PENDING, dueDate: { not: null } },
          orderBy: { dueDate: 'asc' },
          select: { dueDate: true },
        }),
        this.prisma.recipientInvoicePayment.findFirst({
          where: scoped,
          orderBy: { receivedAt: 'desc' },
          select: { amountMinor: true, receivedAt: true },
        }),
        this.prisma.recipientInvoice.count({
          where: { ...scoped, status: PrismaInvoiceStatus.PENDING, dueDate: { lt: now } },
        }),
        this.prisma.recipientInvoice.findFirst({
          where: scoped,
          orderBy: { issuedAt: 'desc' },
          select: { currency: true },
        }),
      ]);

    const outstanding = (pending._sum.amountMinor ?? 0) - (pending._sum.insuranceCoveredMinor ?? 0);
    return {
      currency: anyInvoice === null ? null : TO_DOMAIN_CURRENCY[anyInvoice.currency],
      billedThisMonthMinor: thisMonth._sum.amountMinor ?? 0,
      billedLastMonthMinor: lastMonth._sum.amountMinor ?? 0,
      outstandingMinor: Math.max(0, outstanding),
      earliestDueDate: earliest?.dueDate ?? null,
      lastPaymentMinor: lastPayment?.amountMinor ?? null,
      lastPaymentAt: lastPayment?.receivedAt ?? null,
      overdueCount,
    };
  }

  async serviceBreakdown(recipientId: string, yearStart: Date): Promise<ServiceBreakdownRowView[]> {
    const groups = await this.prisma.recipientInvoiceLine.groupBy({
      by: ['serviceName'],
      where: { invoice: { careRecipientId: recipientId, issuedAt: { gte: yearStart } } },
      _sum: { amountMinor: true },
      orderBy: { _sum: { amountMinor: 'desc' } },
    });
    return groups.map((group) => ({
      serviceName: group.serviceName,
      amountMinor: group._sum.amountMinor ?? 0,
    }));
  }

  async paymentHistory(recipientId: string, limit: number): Promise<PaymentRowView[]> {
    const rows = await this.prisma.recipientInvoicePayment.findMany({
      where: { careRecipientId: recipientId },
      orderBy: { receivedAt: 'desc' },
      take: limit,
      select: { amountMinor: true, currency: true, methodLabel: true, receivedAt: true },
    });
    return rows.map((row) => ({
      amountMinor: row.amountMinor,
      currency: TO_DOMAIN_CURRENCY[row.currency],
      methodLabel: row.methodLabel,
      receivedAt: row.receivedAt,
    }));
  }

  private toRow(row: {
    id: string;
    sequence: number;
    issuedAt: Date;
    periodStart: Date;
    periodEnd: Date;
    servicesLabel: string;
    currency: PrismaCurrency;
    amountMinor: number;
    insuranceCoveredMinor: number;
    status: PrismaInvoiceStatus;
    dueDate: Date | null;
  }): InvoiceRowView {
    return {
      id: row.id,
      sequence: row.sequence,
      issuedAt: row.issuedAt,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      servicesLabel: row.servicesLabel,
      currency: TO_DOMAIN_CURRENCY[row.currency],
      amountMinor: row.amountMinor,
      insuranceCoveredMinor: row.insuranceCoveredMinor,
      status: TO_DOMAIN_STATUS[row.status],
      dueDate: row.dueDate,
    };
  }
}
