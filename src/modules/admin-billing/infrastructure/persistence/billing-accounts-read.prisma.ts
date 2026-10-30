import { Injectable } from '@nestjs/common';
import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AccountBillingStatus,
  BillingAccountRowView,
  BillingAccountsFilter,
  BillingAccountsReadModel,
  BillingAccountsView,
} from '../../application/ports/billing-accounts-read.port';

interface EntryCore {
  id: string;
  sequence: number;
  userId: string | null;
  fullName: string;
  accountName: string | null;
  branch: string | null;
  phone: string | null;
  primaryRecipientId: string | null;
  status: PrismaFamilyStatus;
}

interface PendingInvoice {
  amountMinor: number;
  insuranceCoveredMinor: number;
  currency: string;
  dueDate: Date | null;
}

/**
 * Prisma read model for the Billing Accounts list. Composes each family directory
 * entry with its linked care recipients, the outstanding patient due on their pending
 * invoices and the last recorded payment. Balance dependent filters (the Outstanding
 * tab and the balance range) and paging are applied in memory, so the whole directory
 * is loaded once per request and aggregated.
 *
 * shortcut: in memory aggregation over every account, fine for an agency's hundreds of
 * accounts; materialise an outstanding balance column if accounts reach the thousands.
 */
@Injectable()
export class BillingAccountsReadPrisma implements BillingAccountsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: BillingAccountsFilter, now: Date): Promise<BillingAccountsView> {
    const entries = (await this.prisma.familyDirectoryEntry.findMany({
      orderBy: { sequence: 'desc' },
      select: {
        id: true,
        sequence: true,
        userId: true,
        fullName: true,
        accountName: true,
        branch: true,
        phone: true,
        primaryRecipientId: true,
        status: true,
      },
    })) satisfies EntryCore[];

    const rows = await this.compose(entries, now);

    const branches = [
      ...new Set(entries.map((e) => e.branch).filter((b): b is string => b !== null)),
    ].sort((a, b) => a.localeCompare(b));

    // Tab counts reflect the text and branch filters, never the active tab itself.
    const scoped = rows.filter(
      (row) => matchesSearch(row, filter.search) && matchesBranch(row, filter.branch),
    );
    const counts = {
      all: scoped.length,
      outstanding: scoped.filter((row) => row.outstandingMinor > 0).length,
      inactive: scoped.filter((row) => row.status === PrismaFamilyStatus.INACTIVE).length,
    };

    const filtered = scoped.filter(
      (row) =>
        matchesTab(row, filter.tab) &&
        matchesStatus(row, filter.status) &&
        matchesBalance(row, filter.minBalanceMinor, filter.maxBalanceMinor),
    );

    const start = Math.max(0, (filter.page - 1) * filter.pageSize);
    return {
      rows: filtered.slice(start, start + filter.pageSize),
      total: filtered.length,
      counts,
      branches,
    };
  }

  /** Enrich every entry with recipients, outstanding balance and last payment. */
  private async compose(entries: EntryCore[], now: Date): Promise<BillingAccountRowView[]> {
    const userIds = entries.map((e) => e.userId).filter((id): id is string => id !== null);
    const contactRecipientIds = entries
      .map((e) => e.primaryRecipientId)
      .filter((id): id is string => id !== null);

    const [users, ownedRecipients, contactRecipients] = await Promise.all([
      userIds.length === 0
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, phone: true },
          }),
      userIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { ownerId: { in: userIds } },
            select: { id: true, ownerId: true },
          }),
      contactRecipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { id: { in: contactRecipientIds } },
            select: { id: true, ownerId: true },
          }),
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));
    const recipientsByOwner = new Map<string, string[]>();
    for (const recipient of ownedRecipients) {
      const list = recipientsByOwner.get(recipient.ownerId) ?? [];
      list.push(recipient.id);
      recipientsByOwner.set(recipient.ownerId, list);
    }
    const contactRecipientById = new Map(contactRecipients.map((r) => [r.id, r]));

    const recipientsByEntry = new Map<string, string[]>();
    const allRecipientIds = new Set<string>();
    for (const entry of entries) {
      let ids: string[] = [];
      if (entry.userId !== null) {
        ids = recipientsByOwner.get(entry.userId) ?? [];
      } else if (
        entry.primaryRecipientId !== null &&
        contactRecipientById.has(entry.primaryRecipientId)
      ) {
        ids = [entry.primaryRecipientId];
      }
      recipientsByEntry.set(entry.id, ids);
      ids.forEach((id) => allRecipientIds.add(id));
    }

    const recipientIds = [...allRecipientIds];
    const [invoices, payments] = await Promise.all([
      recipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.recipientInvoice.findMany({
            where: { careRecipientId: { in: recipientIds }, status: 'PENDING' },
            select: {
              careRecipientId: true,
              amountMinor: true,
              insuranceCoveredMinor: true,
              currency: true,
              dueDate: true,
            },
          }),
      recipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.recipientInvoicePayment.findMany({
            where: { careRecipientId: { in: recipientIds } },
            select: { careRecipientId: true, receivedAt: true, currency: true },
          }),
    ]);

    const pendingByRecipient = new Map<string, PendingInvoice[]>();
    for (const invoice of invoices) {
      const list = pendingByRecipient.get(invoice.careRecipientId) ?? [];
      list.push(invoice);
      pendingByRecipient.set(invoice.careRecipientId, list);
    }
    const lastPaymentByRecipient = new Map<string, { at: Date; currency: string }>();
    for (const payment of payments) {
      const current = lastPaymentByRecipient.get(payment.careRecipientId);
      if (current === undefined || payment.receivedAt.getTime() > current.at.getTime()) {
        lastPaymentByRecipient.set(payment.careRecipientId, {
          at: payment.receivedAt,
          currency: payment.currency,
        });
      }
    }

    return entries.map((entry) => {
      const recipients = recipientsByEntry.get(entry.id) ?? [];
      const pending = recipients.flatMap((id) => pendingByRecipient.get(id) ?? []);
      const outstandingMinor = pending.reduce(
        (sum, invoice) => sum + Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor),
        0,
      );
      const lastPayment = recipients
        .map((id) => lastPaymentByRecipient.get(id))
        .filter((p): p is { at: Date; currency: string } => p !== undefined)
        .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
      const user = entry.userId === null ? undefined : usersById.get(entry.userId);
      const primaryContact =
        user === undefined ? entry.fullName : `${user.firstName} ${user.lastName}`.trim();

      return {
        id: entry.id,
        sequence: entry.sequence,
        accountName: entry.accountName ?? primaryContact,
        primaryContact,
        phone: user?.phone ?? entry.phone,
        branch: entry.branch,
        recipientCount: recipients.length,
        outstandingMinor,
        currency: pending[0]?.currency ?? lastPayment?.currency ?? null,
        lastPaymentAt: lastPayment?.at ?? null,
        status: entry.status,
        billingStatus: billingStatus(pending, recipients.length > 0, now),
      };
    });
  }
}

function matchesSearch(row: BillingAccountRowView, search: string | null): boolean {
  if (search === null) {
    return true;
  }
  const needle = search.toLowerCase();
  return (
    row.accountName.toLowerCase().includes(needle) ||
    row.primaryContact.toLowerCase().includes(needle) ||
    (row.phone ?? '').toLowerCase().includes(needle)
  );
}

function matchesBranch(row: BillingAccountRowView, branch: string | null): boolean {
  return branch === null || row.branch === branch;
}

function matchesStatus(row: BillingAccountRowView, status: PrismaFamilyStatus | null): boolean {
  return status === null || row.status === status;
}

function matchesTab(row: BillingAccountRowView, tab: BillingAccountsFilter['tab']): boolean {
  if (tab === 'OUTSTANDING') {
    return row.outstandingMinor > 0;
  }
  if (tab === 'INACTIVE') {
    return row.status === PrismaFamilyStatus.INACTIVE;
  }
  return true;
}

function matchesBalance(
  row: BillingAccountRowView,
  min: number | null,
  max: number | null,
): boolean {
  if (min !== null && row.outstandingMinor < min) {
    return false;
  }
  return max === null || row.outstandingMinor <= max;
}

/** Derive the account billing status from its pending invoices. */
function billingStatus(
  pending: { dueDate: Date | null }[],
  hasRecipients: boolean,
  now: Date,
): AccountBillingStatus {
  if (pending.length === 0) {
    return hasRecipients ? 'CURRENT' : 'NONE';
  }
  const overdue = pending.some(
    (invoice) => invoice.dueDate !== null && invoice.dueDate.getTime() < now.getTime(),
  );
  return overdue ? 'OVERDUE' : 'PENDING';
}
