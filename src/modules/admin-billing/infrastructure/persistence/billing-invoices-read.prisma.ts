import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  BillingInvoiceDetailView,
  BillingInvoiceServicesView,
  BillingInvoicesReadModel,
  InvoiceHistoryEventView,
  InvoicePaymentRowView,
  InvoiceListCounts,
  InvoiceListFilter,
  InvoiceListRowView,
  InvoiceListStatus,
  InvoiceListView,
} from '../../application/ports/billing-invoices-read.port';

/**
 * Prisma read model for the org wide Invoices list. Each invoice is joined to its
 * recipient and, through the recipient, to its billing account in the family directory.
 * The display status (and the Partially Paid case) is derived from the invoice status,
 * its due date and the payments recorded against it, so status filters, the tab counts
 * and paging are applied in memory.
 *
 * shortcut: loads every invoice once per request, fine for an agency's hundreds to low
 * thousands; push the filters to SQL and materialise a status plus paid column when
 * invoices reach the tens of thousands.
 */
@Injectable()
export class BillingInvoicesReadPrisma implements BillingInvoicesReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: InvoiceListFilter, now: Date): Promise<InvoiceListView> {
    const [invoices, entries] = await Promise.all([
      this.prisma.recipientInvoice.findMany({
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          sequence: true,
          issuedAt: true,
          dueDate: true,
          amountMinor: true,
          insuranceCoveredMinor: true,
          currency: true,
          status: true,
          careRecipientId: true,
          careRecipient: { select: { name: true, ownerId: true } },
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

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const payments =
      invoiceIds.length === 0
        ? []
        : await this.prisma.recipientInvoicePayment.findMany({
            where: { invoiceId: { in: invoiceIds } },
            select: { invoiceId: true, amountMinor: true },
          });

    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      if (payment.invoiceId === null) {
        continue;
      }
      paidByInvoice.set(
        payment.invoiceId,
        (paidByInvoice.get(payment.invoiceId) ?? 0) + payment.amountMinor,
      );
    }

    const accountByUserId = new Map(
      entries.filter((e) => e.userId !== null).map((e) => [e.userId as string, e]),
    );
    const accountByRecipientId = new Map(
      entries
        .filter((e) => e.primaryRecipientId !== null)
        .map((e) => [e.primaryRecipientId as string, e]),
    );

    const rows: InvoiceListRowView[] = invoices.map((invoice) => {
      const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
      const account =
        accountByUserId.get(invoice.careRecipient.ownerId) ??
        accountByRecipientId.get(invoice.careRecipientId) ??
        null;
      return {
        id: invoice.id,
        sequence: invoice.sequence,
        issuedAt: invoice.issuedAt,
        billingAccountId: account?.id ?? null,
        billingAccountName: account === null ? null : (account.accountName ?? account.fullName),
        careRecipientName: invoice.careRecipient.name,
        amountMinor: patientDue,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        status: invoiceListStatus(
          invoice.status,
          invoice.dueDate,
          patientDue,
          paidByInvoice.get(invoice.id) ?? 0,
          now,
        ),
      };
    });

    const counts = countByStatus(rows);

    const filtered = rows.filter(
      (row) =>
        (filter.status === null || row.status === filter.status) &&
        matchesSearch(row, filter.search) &&
        (filter.billingAccountId === null || row.billingAccountId === filter.billingAccountId) &&
        matchesDue(row, filter.dueFrom, filter.dueTo) &&
        matchesAmount(row, filter.minAmountMinor, filter.maxAmountMinor),
    );

    const start = Math.max(0, (filter.page - 1) * filter.pageSize);
    return {
      rows: filtered.slice(start, start + filter.pageSize),
      total: filtered.length,
      counts,
    };
  }

  async detail(id: string, now: Date): Promise<BillingInvoiceDetailView | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id },
      select: {
        id: true,
        sequence: true,
        issuedAt: true,
        dueDate: true,
        periodStart: true,
        periodEnd: true,
        amountMinor: true,
        insuranceCoveredMinor: true,
        currency: true,
        status: true,
        careRecipientId: true,
        careRecipient: { select: { name: true, photoKey: true, ownerId: true } },
        lines: {
          orderBy: { position: 'asc' },
          select: {
            serviceName: true,
            amountMinor: true,
            quantity: true,
            rateMinor: true,
            unitLabel: true,
          },
        },
      },
    });
    if (invoice === null) {
      return null;
    }

    const [payments, account] = await Promise.all([
      this.prisma.recipientInvoicePayment.findMany({
        where: { invoiceId: id },
        select: { amountMinor: true },
      }),
      this.resolveAccount(invoice.careRecipient.ownerId, invoice.careRecipientId),
    ]);

    const amountPaidMinor = payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
    const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);

    return {
      id: invoice.id,
      sequence: invoice.sequence,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      status: invoiceListStatus(invoice.status, invoice.dueDate, patientDue, amountPaidMinor, now),
      billingAccountId: account?.id ?? null,
      billingAccountName: account === null ? null : (account.accountName ?? account.fullName),
      careRecipientName: invoice.careRecipient.name,
      careRecipientPhotoKey: invoice.careRecipient.photoKey,
      currency: invoice.currency,
      totalAmountMinor: invoice.amountMinor,
      insuranceCoveredMinor: invoice.insuranceCoveredMinor,
      amountPaidMinor,
      lineItems: invoice.lines.map((line) => ({
        serviceName: line.serviceName,
        amountMinor: line.amountMinor,
        quantity: line.quantity,
        unit: line.unitLabel,
        rateMinor: line.rateMinor,
      })),
    };
  }

  async services(id: string): Promise<BillingInvoiceServicesView | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id },
      select: {
        periodStart: true,
        periodEnd: true,
        currency: true,
        lines: {
          orderBy: { position: 'asc' },
          select: {
            serviceName: true,
            amountMinor: true,
            quantity: true,
            rateMinor: true,
            unitLabel: true,
            category: true,
            serviceDateStart: true,
            serviceDateEnd: true,
            caregiverId: true,
          },
        },
      },
    });
    if (invoice === null) {
      return null;
    }

    // Resolve the per line caregiver ids to names in one query.
    const caregiverIds = [
      ...new Set(
        invoice.lines
          .map((line) => line.caregiverId)
          .filter((caregiverId): caregiverId is string => caregiverId !== null),
      ),
    ];
    const caregivers =
      caregiverIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: caregiverIds } },
            select: { id: true, firstName: true, lastName: true },
          });
    const caregiverName = new Map(
      caregivers.map((caregiver) => [
        caregiver.id,
        `${caregiver.firstName} ${caregiver.lastName}`.trim(),
      ]),
    );

    return {
      currency: invoice.currency,
      servicePeriodStart: invoice.periodStart,
      servicePeriodEnd: invoice.periodEnd,
      services: invoice.lines.map((line) => ({
        serviceName: line.serviceName,
        category: line.category,
        hoursUnits: line.quantity,
        unit: line.unitLabel,
        rateMinor: line.rateMinor,
        amountMinor: line.amountMinor,
        serviceDateStart: line.serviceDateStart,
        serviceDateEnd: line.serviceDateEnd,
        assignedCaregiver:
          line.caregiverId === null ? null : (caregiverName.get(line.caregiverId) ?? null),
      })),
    };
  }

  async payments(id: string): Promise<InvoicePaymentRowView[] | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (invoice === null) {
      return null;
    }
    const payments = await this.prisma.recipientInvoicePayment.findMany({
      where: { invoiceId: id },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        sequence: true,
        amountMinor: true,
        currency: true,
        methodLabel: true,
        receivedAt: true,
      },
    });
    return payments.map((payment) => ({
      id: payment.id,
      sequence: payment.sequence,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      methodLabel: payment.methodLabel,
      receivedAt: payment.receivedAt,
    }));
  }

  async history(id: string): Promise<InvoiceHistoryEventView[] | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id },
      select: { createdAt: true },
    });
    if (invoice === null) {
      return null;
    }
    const payments = await this.prisma.recipientInvoicePayment.findMany({
      where: { invoiceId: id },
      select: { amountMinor: true, methodLabel: true, receivedAt: true },
    });

    // Only the created and payment events are evidenced; approval, send, view and reminder
    // events need an invoice audit log, and the actor (performedBy) is not captured yet.
    const events: InvoiceHistoryEventView[] = [
      {
        type: 'INVOICE_CREATED',
        at: invoice.createdAt,
        amountMinor: null,
        methodLabel: null,
        performedBy: null,
      },
      ...payments.map((payment): InvoiceHistoryEventView => ({
        type: 'PAYMENT_RECORDED',
        at: payment.receivedAt,
        amountMinor: payment.amountMinor,
        methodLabel: payment.methodLabel,
        performedBy: null,
      })),
    ];
    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    return events;
  }

  /** Resolve an invoice's billing account from its recipient (owned, or a linked contact). */
  private async resolveAccount(
    ownerId: string,
    recipientId: string,
  ): Promise<{ id: string; accountName: string | null; fullName: string } | null> {
    const entry = await this.prisma.familyDirectoryEntry.findFirst({
      where: { OR: [{ userId: ownerId }, { primaryRecipientId: recipientId }] },
      select: { id: true, accountName: true, fullName: true },
    });
    return entry;
  }
}

/** PAID, else partially paid, else overdue past its due date, else awaiting payment. */
function invoiceListStatus(
  status: 'PENDING' | 'PAID',
  dueDate: Date | null,
  patientDue: number,
  paidMinor: number,
  now: Date,
): InvoiceListStatus {
  if (status === 'PAID') {
    return 'PAID';
  }
  // A partial payment takes precedence: the office treats it as a distinct state.
  if (paidMinor > 0 && paidMinor < patientDue) {
    return 'PARTIALLY_PAID';
  }
  if (dueDate !== null && dueDate.getTime() < now.getTime()) {
    return 'OVERDUE';
  }
  return 'AWAITING_PAYMENT';
}

// DRAFT is never produced: the model has no draft invoices (issuedAt is required, invoices
// are created already issued). The Draft tab stays empty until a draft creation flow exists.
function countByStatus(rows: InvoiceListRowView[]): InvoiceListCounts {
  return {
    all: rows.length,
    draft: 0,
    awaitingPayment: rows.filter((r) => r.status === 'AWAITING_PAYMENT').length,
    partiallyPaid: rows.filter((r) => r.status === 'PARTIALLY_PAID').length,
    overdue: rows.filter((r) => r.status === 'OVERDUE').length,
    paid: rows.filter((r) => r.status === 'PAID').length,
  };
}

function matchesSearch(row: InvoiceListRowView, search: string | null): boolean {
  if (search === null) {
    return true;
  }
  const needle = search.toLowerCase();
  return (
    `inv-${row.issuedAt.getUTCFullYear()}-${String(row.sequence).padStart(3, '0')}`.includes(
      needle,
    ) ||
    (row.billingAccountName ?? '').toLowerCase().includes(needle) ||
    row.careRecipientName.toLowerCase().includes(needle)
  );
}

function matchesDue(row: InvoiceListRowView, from: Date | null, to: Date | null): boolean {
  if (from === null && to === null) {
    return true;
  }
  if (row.dueDate === null) {
    return false;
  }
  const due = row.dueDate.getTime();
  if (from !== null && due < from.getTime()) {
    return false;
  }
  return to === null || due <= to.getTime();
}

function matchesAmount(row: InvoiceListRowView, min: number | null, max: number | null): boolean {
  if (min !== null && row.amountMinor < min) {
    return false;
  }
  return max === null || row.amountMinor <= max;
}
