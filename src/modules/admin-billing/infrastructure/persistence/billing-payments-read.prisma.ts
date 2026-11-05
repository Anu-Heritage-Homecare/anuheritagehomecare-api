import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  BillingPaymentsReadModel,
  PaymentListCounts,
  PaymentListFilter,
  PaymentListRowView,
  PaymentListView,
} from '../../application/ports/billing-payments-read.port';

/**
 * Prisma read model for the org wide Payments list. Each recorded payment is joined to
 * its recipient and, through the recipient, to its billing account in the family
 * directory, and to the invoice it settled for the invoice reference. Status is always
 * COMPLETED (a recorded payment is a settled fact; the model stores no payment status),
 * so the status filter, tab counts and paging are applied in memory.
 *
 * shortcut: loads every payment once per request, fine for an agency's hundreds to low
 * thousands; push the filters to SQL and materialise a status column when payments reach
 * the tens of thousands (and when pending/failed/refunded states are actually captured).
 */
@Injectable()
export class BillingPaymentsReadPrisma implements BillingPaymentsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: PaymentListFilter): Promise<PaymentListView> {
    const [payments, entries] = await Promise.all([
      this.prisma.recipientInvoicePayment.findMany({
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          sequence: true,
          invoiceId: true,
          amountMinor: true,
          currency: true,
          methodLabel: true,
          receivedAt: true,
          careRecipientId: true,
          careRecipient: { select: { ownerId: true } },
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
      ...new Set(payments.map((p) => p.invoiceId).filter((v): v is string => v !== null)),
    ];
    const invoices =
      invoiceIds.length === 0
        ? []
        : await this.prisma.recipientInvoice.findMany({
            where: { id: { in: invoiceIds } },
            select: { id: true, sequence: true, issuedAt: true },
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

    const rows: PaymentListRowView[] = payments.map((payment) => {
      const invoice = payment.invoiceId === null ? undefined : invoiceById.get(payment.invoiceId);
      const account =
        accountByUserId.get(payment.careRecipient.ownerId) ??
        accountByRecipientId.get(payment.careRecipientId) ??
        null;
      return {
        id: payment.id,
        sequence: payment.sequence,
        receivedAt: payment.receivedAt,
        invoiceSequence: invoice?.sequence ?? null,
        invoiceIssuedAt: invoice?.issuedAt ?? null,
        billingAccountId: account?.id ?? null,
        billingAccountName: account === null ? null : (account.accountName ?? account.fullName),
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        methodLabel: payment.methodLabel,
        // A recorded payment is a settled fact; the model captures no other state.
        status: 'COMPLETED',
      };
    });

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
}

// Pending, failed and refunded are never produced: the model records only settled
// payments, so those tabs stay empty until those states are actually captured.
function countByStatus(rows: PaymentListRowView[]): PaymentListCounts {
  return {
    all: rows.length,
    pending: 0,
    completed: rows.filter((r) => r.status === 'COMPLETED').length,
    failed: 0,
    refunded: 0,
  };
}

function matchesSearch(row: PaymentListRowView, search: string | null): boolean {
  if (search === null) {
    return true;
  }
  const needle = search.toLowerCase();
  const reference = `txn-${String(row.sequence).padStart(4, '0')}`;
  const invoiceNumber =
    row.invoiceSequence === null || row.invoiceIssuedAt === null
      ? ''
      : `inv-${row.invoiceIssuedAt.getUTCFullYear()}-${String(row.invoiceSequence).padStart(3, '0')}`;
  return (
    reference.includes(needle) ||
    invoiceNumber.includes(needle) ||
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
