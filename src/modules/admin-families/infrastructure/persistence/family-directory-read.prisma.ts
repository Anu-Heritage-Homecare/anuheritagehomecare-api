import { Injectable } from '@nestjs/common';
import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  FamilyBillingStatus,
  FamilyDetailView,
  FamilyDirectoryReadModel,
  FamilyKpisView,
  FamilyPageView,
  FamilyRowView,
} from '../../application/ports/family-directory-read.port';

const DAY_MS = 86_400_000;

interface EntryCore {
  id: string;
  sequence: number;
  subjectKind: 'ACCOUNT' | 'CONTACT';
  userId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  primaryRecipientId: string | null;
  status: PrismaFamilyStatus;
  quickNotes: string | null;
  emergencyContactVerified: boolean;
  updatedAt: Date;
}

interface RecipientInfo {
  id: string;
  name: string;
  ownerId: string;
}

/**
 * Prisma read model for the Families directory. Composes each directory entry with
 * its live user account (or captured contact details), the linked care recipients
 * and the billing status derived from pending invoices. Batched to avoid N plus 1.
 */
@Injectable()
export class FamilyDirectoryReadPrisma implements FamilyDirectoryReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    status: PrismaFamilyStatus | null,
    page: number,
    pageSize: number,
  ): Promise<FamilyPageView> {
    const where = status === null ? {} : { status };
    const [total, entries] = await this.prisma.$transaction([
      this.prisma.familyDirectoryEntry.count({ where }),
      this.prisma.familyDirectoryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
      }),
    ]);

    const context = await this.buildContext(entries, new Date());
    return { total, rows: entries.map((entry) => this.toRow(entry, context)) };
  }

  async detail(id: string): Promise<FamilyDetailView | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({ where: { id } });
    if (entry === null) {
      return null;
    }
    const now = new Date();
    const context = await this.buildContext([entry], now);
    const row = this.toRow(entry, context);
    const recipients = context.recipientsByEntry.get(entry.id) ?? [];
    const primary =
      entry.primaryRecipientId === null
        ? (recipients[0]?.name ?? null)
        : (recipients.find((r) => r.id === entry.primaryRecipientId)?.name ?? null);
    const outstanding = context.outstandingByEntry.get(entry.id) ?? {
      amountMinor: 0,
      currency: null,
    };

    return {
      id: row.id,
      reference: row.reference,
      name: row.name,
      relationship: row.relationship,
      hasAccount: row.hasAccount,
      phone: row.phone,
      email: row.email,
      primaryRecipientName: primary,
      linkedRecipientNames: row.linkedRecipientNames,
      emergencyContactVerified: entry.emergencyContactVerified,
      outstandingBalanceMinor: outstanding.amountMinor,
      currency: outstanding.currency,
      billingStatus: row.billingStatus,
      status: entry.status,
      quickNotes: entry.quickNotes,
      lastActivity: entry.updatedAt,
      unreadMessages: null,
    };
  }

  async kpis(now: Date): Promise<FamilyKpisView> {
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
    const [entries, activeRecipients, pendingInvoices] = await Promise.all([
      this.prisma.familyDirectoryEntry.findMany({
        select: {
          subjectKind: true,
          userId: true,
          primaryRecipientId: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.careRecipient.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, ownerId: true },
      }),
      this.prisma.recipientInvoice.findMany({
        where: { status: 'PENDING' },
        select: { careRecipientId: true },
        distinct: ['careRecipientId'],
      }),
    ]);

    const activeOwnerIds = new Set(activeRecipients.map((r) => r.ownerId));
    const activeRecipientIds = new Set(activeRecipients.map((r) => r.id));
    const pendingRecipientIds = new Set(pendingInvoices.map((i) => i.careRecipientId));
    const pendingRecipients = await this.prisma.careRecipient.findMany({
      where: { id: { in: [...pendingRecipientIds] } },
      select: { ownerId: true },
    });
    const pendingOwnerIds = new Set(pendingRecipients.map((r) => r.ownerId));

    const hasActiveCare = (entry: (typeof entries)[number]): boolean =>
      (entry.userId !== null && activeOwnerIds.has(entry.userId)) ||
      (entry.primaryRecipientId !== null && activeRecipientIds.has(entry.primaryRecipientId));
    const hasOutstanding = (entry: (typeof entries)[number]): boolean =>
      (entry.userId !== null && pendingOwnerIds.has(entry.userId)) ||
      (entry.primaryRecipientId !== null && pendingRecipientIds.has(entry.primaryRecipientId));

    return {
      totalFamilies: entries.length,
      newFamilies: entries.filter((e) => e.createdAt.getTime() >= monthAgo.getTime()).length,
      primaryContacts: entries.filter((e) => e.primaryRecipientId !== null).length,
      withActiveCare: entries.filter(hasActiveCare).length,
      outstandingPayments: entries.filter(hasOutstanding).length,
      pendingRequests: entries.filter((e) => e.status === PrismaFamilyStatus.PENDING_VERIFICATION)
        .length,
      unreadMessages: null,
    };
  }

  private async buildContext(entries: EntryCore[], now: Date): Promise<DirectoryContext> {
    const userIds = entries.map((e) => e.userId).filter((id): id is string => id !== null);
    const contactRecipientIds = entries
      .map((e) => e.primaryRecipientId)
      .filter((id): id is string => id !== null);

    const [users, ownedRecipients, contactRecipients] = await Promise.all([
      userIds.length === 0
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          }),
      userIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { ownerId: { in: userIds } },
            select: { id: true, name: true, ownerId: true },
          }),
      contactRecipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { id: { in: contactRecipientIds } },
            select: { id: true, name: true, ownerId: true },
          }),
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));
    const recipientsByOwner = new Map<string, RecipientInfo[]>();
    for (const recipient of ownedRecipients) {
      const list = recipientsByOwner.get(recipient.ownerId) ?? [];
      list.push(recipient);
      recipientsByOwner.set(recipient.ownerId, list);
    }
    const contactRecipientById = new Map(contactRecipients.map((r) => [r.id, r]));

    const recipientsByEntry = new Map<string, RecipientInfo[]>();
    const allRecipientIds = new Set<string>();
    for (const entry of entries) {
      let recipients: RecipientInfo[] = [];
      if (entry.userId !== null) {
        recipients = recipientsByOwner.get(entry.userId) ?? [];
      } else if (entry.primaryRecipientId !== null) {
        const recipient = contactRecipientById.get(entry.primaryRecipientId);
        recipients = recipient === undefined ? [] : [recipient];
      }
      recipientsByEntry.set(entry.id, recipients);
      recipients.forEach((r) => allRecipientIds.add(r.id));
    }

    const invoices =
      allRecipientIds.size === 0
        ? []
        : await this.prisma.recipientInvoice.findMany({
            where: { careRecipientId: { in: [...allRecipientIds] }, status: 'PENDING' },
            select: { careRecipientId: true, amountMinor: true, currency: true, dueDate: true },
          });
    const invoicesByRecipient = new Map<
      string,
      { amountMinor: number; currency: string; dueDate: Date | null }[]
    >();
    for (const invoice of invoices) {
      const list = invoicesByRecipient.get(invoice.careRecipientId) ?? [];
      list.push({
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
      });
      invoicesByRecipient.set(invoice.careRecipientId, list);
    }

    const billingByEntry = new Map<string, FamilyBillingStatus>();
    const outstandingByEntry = new Map<string, { amountMinor: number; currency: string | null }>();
    for (const entry of entries) {
      const recipients = recipientsByEntry.get(entry.id) ?? [];
      const pending = recipients.flatMap((r) => invoicesByRecipient.get(r.id) ?? []);
      billingByEntry.set(entry.id, billingStatus(pending, recipients.length > 0, now));
      outstandingByEntry.set(entry.id, {
        amountMinor: pending.reduce((sum, i) => sum + i.amountMinor, 0),
        currency: pending[0]?.currency ?? null,
      });
    }

    return { usersById, recipientsByEntry, billingByEntry, outstandingByEntry };
  }

  private toRow(entry: EntryCore, context: DirectoryContext): FamilyRowView {
    const user = entry.userId === null ? undefined : context.usersById.get(entry.userId);
    const recipients = context.recipientsByEntry.get(entry.id) ?? [];
    return {
      id: entry.id,
      reference: `FAM-${entry.sequence}`,
      name: user === undefined ? entry.fullName : `${user.firstName} ${user.lastName}`.trim(),
      relationship: entry.relationship,
      hasAccount: entry.userId !== null,
      phone: user?.phone ?? entry.phone,
      email: user?.email ?? entry.email,
      linkedRecipientNames: recipients.map((r) => r.name),
      billingStatus: context.billingByEntry.get(entry.id) ?? 'NONE',
      status: entry.status,
      unreadMessages: null,
      lastActivity: entry.updatedAt,
    };
  }
}

interface DirectoryContext {
  usersById: Map<string, { firstName: string; lastName: string; phone: string; email: string }>;
  recipientsByEntry: Map<string, RecipientInfo[]>;
  billingByEntry: Map<string, FamilyBillingStatus>;
  outstandingByEntry: Map<string, { amountMinor: number; currency: string | null }>;
}

/** Derive the billing status from a family's pending invoices. */
function billingStatus(
  pending: { dueDate: Date | null }[],
  hasRecipients: boolean,
  now: Date,
): FamilyBillingStatus {
  if (pending.length === 0) {
    return hasRecipients ? 'CURRENT' : 'NONE';
  }
  const overdue = pending.some(
    (invoice) => invoice.dueDate !== null && invoice.dueDate.getTime() < now.getTime(),
  );
  return overdue ? 'OVERDUE' : 'PENDING';
}
