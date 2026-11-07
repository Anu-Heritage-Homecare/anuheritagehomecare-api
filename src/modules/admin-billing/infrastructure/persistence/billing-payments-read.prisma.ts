import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  BillingPaymentsReadModel,
  PaymentDetailView,
  PaymentListCounts,
  PaymentListFilter,
  PaymentListRowView,
  PaymentListView,
} from '../../application/ports/billing-payments-read.port';

type Entry = {
  id: string;
  userId: string | null;
  primaryRecipientId: string | null;
  fullName: string;
  accountName: string | null;
};

/**
 * Prisma read model for the org wide Payments list. It unions two sources: recorded
 * invoice payments (recipient_invoice_payments), which are settled facts shown as
 * COMPLETED (or REFUNDED once reversed), and the pending or failed online invoice
 * charges from the payments table (succeeded charges are excluded, since they land as
 * a recorded payment). Each is joined to its invoice and billing account. The status
 * filter, tab counts and paging are applied in memory.
 *
 * shortcut: loads every payment once per request, fine for an agency's hundreds to low
 * thousands; push the filters to SQL and materialise a status column at the tens of
 * thousands.
 */
@Injectable()
export class BillingPaymentsReadPrisma implements BillingPaymentsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: PaymentListFilter): Promise<PaymentListView> {
    const [recorded, gateway, entries] = await Promise.all([
      this.prisma.recipientInvoicePayment.findMany({
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          sequence: true,
          invoiceId: true,
          amountMinor: true,
          refundedAmountMinor: true,
          currency: true,
          methodLabel: true,
          receivedAt: true,
          refundedAt: true,
          careRecipientId: true,
          careRecipient: { select: { ownerId: true } },
        },
      }),
      // Pending and failed online invoice charges; succeeded ones become a recorded
      // payment via the webhook, so they are excluded here to avoid a double count.
      this.prisma.payment.findMany({
        where: { payableType: 'INVOICE', status: { in: ['PENDING', 'FAILED'] } },
        select: {
          id: true,
          payableId: true,
          amountMinor: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.familyDirectoryEntry.findMany({
        select: {
          id: true,
          userId: true,
          primaryRecipientId: true,
          fullName: true,
          accountName: true,
        },
      }),
    ]);

    const invoiceIds = [
      ...new Set([
        ...recorded.map((p) => p.invoiceId).filter((v): v is string => v !== null),
        ...gateway.map((p) => p.payableId),
      ]),
    ];
    const invoices =
      invoiceIds.length === 0
        ? []
        : await this.prisma.recipientInvoice.findMany({
            where: { id: { in: invoiceIds } },
            select: {
              id: true,
              sequence: true,
              issuedAt: true,
              careRecipientId: true,
              careRecipient: { select: { ownerId: true } },
            },
          });
    const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));

    const accountByUserId = new Map(
      entries.filter((e) => e.userId !== null).map((e) => [e.userId as string, e]),
    );
    const accountByRecipientId = new Map(
      entries
        .filter((e) => e.primaryRecipientId !== null)
        .map((e) => [e.primaryRecipientId as string, e]),
    );
    const accountFor = (ownerId: string | null, recipientId: string | null): Entry | null =>
      (ownerId === null ? undefined : accountByUserId.get(ownerId)) ??
      (recipientId === null ? undefined : accountByRecipientId.get(recipientId)) ??
      null;

    const rows: PaymentListRowView[] = [
      ...recorded.map((payment): PaymentListRowView => {
        const invoice = payment.invoiceId === null ? undefined : invoiceById.get(payment.invoiceId);
        const account = accountFor(payment.careRecipient.ownerId, payment.careRecipientId);
        return {
          id: payment.id,
          reference: `PAY-${payment.receivedAt.getUTCFullYear()}-${String(payment.sequence).padStart(4, '0')}`,
          receivedAt: payment.receivedAt,
          invoiceNumber:
            invoice === undefined ? null : invoiceNumber(invoice.issuedAt, invoice.sequence),
          billingAccountId: account?.id ?? null,
          billingAccountName: account === null ? null : (account.accountName ?? account.fullName),
          amountMinor: payment.amountMinor,
          refundedAmountMinor: payment.refundedAmountMinor,
          refundableRemainingMinor: Math.max(0, payment.amountMinor - payment.refundedAmountMinor),
          currency: payment.currency,
          methodLabel: payment.methodLabel,
          status: payment.refundedAt === null ? 'COMPLETED' : 'REFUNDED',
        };
      }),
      ...gateway.map((payment): PaymentListRowView => {
        const invoice = invoiceById.get(payment.payableId);
        const account = accountFor(
          invoice?.careRecipient.ownerId ?? null,
          invoice?.careRecipientId ?? null,
        );
        return {
          id: payment.id,
          reference: `PAY-${payment.createdAt.getUTCFullYear()}-${payment.id.slice(0, 8)}`,
          receivedAt: payment.createdAt,
          invoiceNumber:
            invoice === undefined ? null : invoiceNumber(invoice.issuedAt, invoice.sequence),
          billingAccountId: account?.id ?? null,
          billingAccountName: account === null ? null : (account.accountName ?? account.fullName),
          amountMinor: payment.amountMinor,
          refundedAmountMinor: 0,
          refundableRemainingMinor: 0,
          currency: payment.currency,
          methodLabel: 'Online Payment',
          status: payment.status === 'PENDING' ? 'PENDING' : 'FAILED',
        };
      }),
    ].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    const methods = [
      ...new Set(rows.map((r) => r.methodLabel).filter((m): m is string => m !== null)),
    ].sort((a, b) => a.localeCompare(b));

    const counts = countByStatus(rows);

    const filtered = rows.filter(
      (row) =>
        (filter.status === null || row.status === filter.status) &&
        matchesSearch(row, filter.search) &&
        (filter.billingAccountId === null || row.billingAccountId === filter.billingAccountId) &&
        (filter.method === null || row.methodLabel === filter.method) &&
        matchesReceived(row, filter.receivedFrom, filter.receivedTo) &&
        matchesAmount(row, filter.minAmountMinor, filter.maxAmountMinor),
    );

    const start = Math.max(0, (filter.page - 1) * filter.pageSize);
    return {
      rows: filtered.slice(start, start + filter.pageSize),
      total: filtered.length,
      counts,
      methods,
    };
  }

  async detail(paymentId: string): Promise<PaymentDetailView | null> {
    const payment = await this.prisma.recipientInvoicePayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        sequence: true,
        invoiceId: true,
        amountMinor: true,
        currency: true,
        methodLabel: true,
        receivedAt: true,
        referenceNumber: true,
        bankName: true,
        notes: true,
        refundedAt: true,
        careRecipientId: true,
        careRecipient: { select: { ownerId: true } },
        events: {
          orderBy: { at: 'desc' },
          select: {
            type: true,
            at: true,
            actorType: true,
            actorAdminId: true,
            actorLabel: true,
            detail: true,
          },
        },
      },
    });
    if (payment === null) {
      return null;
    }

    const invoice =
      payment.invoiceId === null
        ? null
        : await this.prisma.recipientInvoice.findUnique({
            where: { id: payment.invoiceId },
            select: { sequence: true, issuedAt: true, amountMinor: true, status: true },
          });

    const account = await this.resolveAccount(
      payment.careRecipient.ownerId,
      payment.careRecipientId,
    );

    return {
      id: payment.id,
      sequence: payment.sequence,
      receivedAt: payment.receivedAt,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      methodLabel: payment.methodLabel,
      referenceNumber: payment.referenceNumber,
      bankName: payment.bankName,
      notes: payment.notes,
      refundedAt: payment.refundedAt,
      invoiceSequence: invoice?.sequence ?? null,
      invoiceIssuedAt: invoice?.issuedAt ?? null,
      invoiceAmountMinor: invoice?.amountMinor ?? null,
      invoiceStatus: invoice?.status ?? null,
      accountName: account === null ? null : (account.accountName ?? account.fullName),
      events: payment.events,
    };
  }

  /** The billing account (owned entry or a single linked contact) for a payment. */
  private async resolveAccount(
    ownerId: string | null,
    recipientId: string | null,
  ): Promise<Entry | null> {
    const entries = await this.prisma.familyDirectoryEntry.findMany({
      where:
        ownerId === null
          ? { primaryRecipientId: recipientId }
          : { OR: [{ userId: ownerId }, { primaryRecipientId: recipientId }] },
      select: {
        id: true,
        userId: true,
        primaryRecipientId: true,
        fullName: true,
        accountName: true,
      },
    });
    return (
      entries.find((e) => e.userId === ownerId) ??
      entries.find((e) => e.primaryRecipientId === recipientId) ??
      null
    );
  }
}

/** Matches the per recipient Billing view: INV-<year>-<sequence>. */
function invoiceNumber(issuedAt: Date, sequence: number): string {
  return `INV-${issuedAt.getUTCFullYear()}-${String(sequence).padStart(3, '0')}`;
}

function countByStatus(rows: PaymentListRowView[]): PaymentListCounts {
  return {
    all: rows.length,
    pending: rows.filter((r) => r.status === 'PENDING').length,
    completed: rows.filter((r) => r.status === 'COMPLETED').length,
    failed: rows.filter((r) => r.status === 'FAILED').length,
    refunded: rows.filter((r) => r.status === 'REFUNDED').length,
  };
}

function matchesSearch(row: PaymentListRowView, search: string | null): boolean {
  if (search === null) {
    return true;
  }
  const needle = search.toLowerCase();
  return (
    row.reference.toLowerCase().includes(needle) ||
    (row.invoiceNumber ?? '').toLowerCase().includes(needle) ||
    (row.billingAccountName ?? '').toLowerCase().includes(needle)
  );
}

function matchesReceived(row: PaymentListRowView, from: Date | null, to: Date | null): boolean {
  if (from === null && to === null) {
    return true;
  }
  const received = row.receivedAt.getTime();
  if (from !== null && received < from.getTime()) {
    return false;
  }
  return to === null || received <= to.getTime();
}

function matchesAmount(row: PaymentListRowView, min: number | null, max: number | null): boolean {
  if (min !== null && row.amountMinor < min) {
    return false;
  }
  return max === null || row.amountMinor <= max;
}
