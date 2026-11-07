import { Injectable } from '@nestjs/common';
import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AccountBillingStatus,
  BillingAccountActivityEventView,
  BillingAccountActivityView,
  BillingAccountDetailView,
  BillingAccountEventView,
  BillingAccountInvoiceRowView,
  BillingAccountInvoiceView,
  BillingAccountPaymentRowView,
  BillingAccountRecipientView,
  BillingAccountRowView,
  BillingAccountsFilter,
  BillingAccountsReadModel,
  BillingAccountsView,
} from '../../application/ports/billing-accounts-read.port';

/** The account panels show the most recent handful of invoices and events. */
const RECENT_INVOICE_LIMIT = 5;
const TIMELINE_LIMIT = 8;

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
  createdAt: Date;
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
        createdAt: true,
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

  async detail(id: string): Promise<BillingAccountDetailView | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id },
      select: {
        id: true,
        sequence: true,
        userId: true,
        fullName: true,
        accountName: true,
        branch: true,
        email: true,
        phone: true,
        primaryRecipientId: true,
        status: true,
        createdAt: true,
        preferredPaymentMethod: true,
      },
    });
    if (entry === null) {
      return null;
    }

    const recipients = await this.resolveRecipients(entry.userId, entry.primaryRecipientId);
    const recipientIds = recipients.map((r) => r.id);
    const user =
      entry.userId === null
        ? null
        : await this.prisma.user.findUnique({
            where: { id: entry.userId },
            select: { firstName: true, lastName: true, email: true, phone: true },
          });

    const [invoices, payments] =
      recipientIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.prisma.recipientInvoice.findMany({
              where: { careRecipientId: { in: recipientIds } },
              select: {
                sequence: true,
                issuedAt: true,
                dueDate: true,
                amountMinor: true,
                insuranceCoveredMinor: true,
                currency: true,
                status: true,
              },
            }),
            this.prisma.recipientInvoicePayment.findMany({
              where: { careRecipientId: { in: recipientIds }, refundedAt: null },
              select: { amountMinor: true, methodLabel: true, currency: true, receivedAt: true },
            }),
          ]);

    const patientDue = (invoice: (typeof invoices)[number]): number =>
      Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
    const outstandingMinor = invoices
      .filter((invoice) => invoice.status === 'PENDING')
      .reduce((sum, invoice) => sum + patientDue(invoice), 0);
    const totalBilledMinor = invoices.reduce((sum, invoice) => sum + patientDue(invoice), 0);
    const totalPaidMinor = payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
    const lastPayment = [...payments].sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    )[0];

    const recentInvoices: BillingAccountInvoiceView[] = [...invoices]
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
      .slice(0, RECENT_INVOICE_LIMIT)
      .map((invoice) => ({
        sequence: invoice.sequence,
        issuedAt: invoice.issuedAt,
        amountMinor: patientDue(invoice),
        dueDate: invoice.dueDate,
        status: invoice.status,
      }));

    const [revisions, accountEvents, settings] = await Promise.all([
      recipientIds.length === 0
        ? []
        : this.prisma.carePlanRevision.findMany({
            where: { careRecipientId: { in: recipientIds } },
            select: { description: true, authorAdminId: true, createdAt: true },
          }),
      this.prisma.billingAccountEvent.findMany({
        where: { familyDirectoryEntryId: id },
        select: { kind: true, detail: true, actorAdminId: true, createdAt: true },
      }),
      this.prisma.billingSettings.findFirst({ select: { defaultPaymentTermsDays: true } }),
    ]);

    const adminNames = await this.resolveAdminNames([
      ...revisions.map((r) => r.authorAdminId),
      ...accountEvents.map((e) => e.actorAdminId),
    ]);

    const timeline = this.buildTimeline(
      invoices,
      payments,
      recipients,
      revisions,
      accountEvents,
      adminNames,
    );

    const primaryContact =
      user === null ? entry.fullName : `${user.firstName} ${user.lastName}`.trim();

    return {
      id: entry.id,
      sequence: entry.sequence,
      accountName: entry.accountName ?? primaryContact,
      primaryContact,
      email: entry.email ?? user?.email ?? null,
      phone: user?.phone ?? entry.phone,
      branch: entry.branch,
      status: entry.status,
      createdAt: entry.createdAt,
      currency: invoices[0]?.currency ?? payments[0]?.currency ?? null,
      paymentTermsDays: settings?.defaultPaymentTermsDays ?? null,
      preferredPaymentMethod: entry.preferredPaymentMethod,
      outstandingMinor,
      totalBilledMinor,
      totalPaidMinor,
      lastPaymentAt: lastPayment?.receivedAt ?? null,
      recentInvoices,
      timeline,
    };
  }

  async careRecipients(id: string): Promise<BillingAccountRecipientView[] | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id },
      select: { userId: true, primaryRecipientId: true },
    });
    if (entry === null) {
      return null;
    }

    const recipients = await this.loadRecipientProfiles(entry.userId, entry.primaryRecipientId);
    if (recipients.length === 0) {
      return [];
    }

    const recipientIds = recipients.map((r) => r.id);
    const subscriptions = await this.prisma.subscription.findMany({
      where: { careRecipientId: { in: recipientIds } },
      select: {
        careRecipientId: true,
        planType: true,
        monthlyPriceMinor: true,
        currency: true,
        startDate: true,
        status: true,
        createdAt: true,
      },
    });

    // Current subscription per recipient: an active one wins, else the most recent.
    const currentByRecipient = new Map<string, (typeof subscriptions)[number]>();
    for (const sub of subscriptions) {
      const existing = currentByRecipient.get(sub.careRecipientId);
      if (existing === undefined || isMoreCurrent(sub, existing)) {
        currentByRecipient.set(sub.careRecipientId, sub);
      }
    }

    const planTypes = [...new Set([...currentByRecipient.values()].map((s) => s.planType))];
    const plans =
      planTypes.length === 0
        ? []
        : await this.prisma.carePlan.findMany({
            where: { type: { in: planTypes } },
            select: { type: true, name: true },
          });
    const planName = new Map(plans.map((p) => [p.type, p.name]));

    return recipients.map((recipient) => {
      const sub = currentByRecipient.get(recipient.id);
      return {
        id: recipient.id,
        name: recipient.name,
        photoKey: recipient.photoKey,
        relationship: recipient.relationship,
        servicePlan: sub === undefined ? null : (planName.get(sub.planType) ?? null),
        monthlyCostMinor: sub?.monthlyPriceMinor ?? null,
        currency: sub?.currency ?? null,
        startDate: sub?.startDate ?? null,
        status: sub?.status ?? recipient.status,
      };
    });
  }

  async invoices(id: string, now: Date): Promise<BillingAccountInvoiceRowView[] | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id },
      select: { userId: true, primaryRecipientId: true },
    });
    if (entry === null) {
      return null;
    }

    const recipients = await this.resolveRecipients(entry.userId, entry.primaryRecipientId);
    const recipientIds = recipients.map((r) => r.id);
    if (recipientIds.length === 0) {
      return [];
    }

    const [invoices, payments] = await Promise.all([
      this.prisma.recipientInvoice.findMany({
        where: { careRecipientId: { in: recipientIds } },
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          sequence: true,
          issuedAt: true,
          periodStart: true,
          periodEnd: true,
          amountMinor: true,
          insuranceCoveredMinor: true,
          currency: true,
          dueDate: true,
          status: true,
        },
      }),
      this.prisma.recipientInvoicePayment.findMany({
        where: { careRecipientId: { in: recipientIds }, invoiceId: { not: null } },
        select: { invoiceId: true, amountMinor: true },
      }),
    ]);

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

    return invoices.map((invoice) => ({
      id: invoice.id,
      sequence: invoice.sequence,
      issuedAt: invoice.issuedAt,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      amountMinor: Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor),
      dueDate: invoice.dueDate,
      paidAmountMinor: paidByInvoice.get(invoice.id) ?? 0,
      currency: invoice.currency,
      status: invoiceDisplayStatus(invoice.status, invoice.dueDate, now),
    }));
  }

  async payments(id: string): Promise<BillingAccountPaymentRowView[] | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id },
      select: { userId: true, primaryRecipientId: true },
    });
    if (entry === null) {
      return null;
    }

    const recipients = await this.resolveRecipients(entry.userId, entry.primaryRecipientId);
    const recipientIds = recipients.map((r) => r.id);
    if (recipientIds.length === 0) {
      return [];
    }

    const payments = await this.prisma.recipientInvoicePayment.findMany({
      where: { careRecipientId: { in: recipientIds } },
      orderBy: { receivedAt: 'desc' },
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
      },
    });

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

    return payments.map((payment) => {
      const invoice = payment.invoiceId === null ? undefined : invoiceById.get(payment.invoiceId);
      return {
        id: payment.id,
        sequence: payment.sequence,
        invoiceSequence: invoice?.sequence ?? null,
        invoiceIssuedAt: invoice?.issuedAt ?? null,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        methodLabel: payment.methodLabel,
        receivedAt: payment.receivedAt,
        referenceNumber: payment.referenceNumber,
        bankName: payment.bankName,
        notes: payment.notes,
      };
    });
  }

  async activity(id: string): Promise<BillingAccountActivityView | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id },
      select: { userId: true, primaryRecipientId: true },
    });
    if (entry === null) {
      return null;
    }

    const recipients = await this.resolveRecipients(entry.userId, entry.primaryRecipientId);
    const recipientIds = recipients.map((r) => r.id);
    if (recipientIds.length === 0) {
      return { currency: null, events: [] };
    }

    const [invoices, payments, revisions, accountEvents] = await Promise.all([
      this.prisma.recipientInvoice.findMany({
        where: { careRecipientId: { in: recipientIds } },
        select: {
          id: true,
          sequence: true,
          issuedAt: true,
          periodStart: true,
          periodEnd: true,
          amountMinor: true,
          insuranceCoveredMinor: true,
          currency: true,
        },
      }),
      this.prisma.recipientInvoicePayment.findMany({
        where: { careRecipientId: { in: recipientIds } },
        select: {
          amountMinor: true,
          methodLabel: true,
          currency: true,
          receivedAt: true,
          invoiceId: true,
        },
      }),
      this.prisma.carePlanRevision.findMany({
        where: { careRecipientId: { in: recipientIds } },
        select: { description: true, authorAdminId: true, createdAt: true },
      }),
      this.prisma.billingAccountEvent.findMany({
        where: { familyDirectoryEntryId: id },
        select: { kind: true, detail: true, actorAdminId: true, createdAt: true },
      }),
    ]);

    const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));
    const adminNames = await this.resolveAdminNames([
      ...revisions.map((r) => r.authorAdminId),
      ...accountEvents.map((e) => e.actorAdminId),
    ]);

    const events: BillingAccountActivityEventView[] = [
      ...invoices.map((invoice): BillingAccountActivityEventView => ({
        type: 'INVOICE_ISSUED',
        at: invoice.issuedAt,
        amountMinor: Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor),
        methodLabel: null,
        invoiceSequence: invoice.sequence,
        invoiceIssuedAt: invoice.issuedAt,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        recipientName: null,
        detail: null,
        performedBy: null,
      })),
      ...payments.map((payment): BillingAccountActivityEventView => {
        const invoice = payment.invoiceId === null ? undefined : invoiceById.get(payment.invoiceId);
        return {
          type: 'PAYMENT_RECORDED',
          at: payment.receivedAt,
          amountMinor: payment.amountMinor,
          methodLabel: payment.methodLabel,
          invoiceSequence: invoice?.sequence ?? null,
          invoiceIssuedAt: invoice?.issuedAt ?? null,
          periodStart: null,
          periodEnd: null,
          recipientName: null,
          detail: null,
          performedBy: null,
        };
      }),
      ...recipients.map((recipient): BillingAccountActivityEventView => ({
        type: 'CARE_RECIPIENT_LINKED',
        at: recipient.createdAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        periodStart: null,
        periodEnd: null,
        recipientName: recipient.name,
        detail: null,
        performedBy: null,
      })),
      ...revisions.map((revision): BillingAccountActivityEventView => ({
        type: 'CARE_PLAN_UPDATED',
        at: revision.createdAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        periodStart: null,
        periodEnd: null,
        recipientName: null,
        detail: revision.description,
        performedBy: nameFor(revision.authorAdminId, adminNames),
      })),
      ...accountEvents.map((event): BillingAccountActivityEventView => ({
        type: event.kind,
        at: event.createdAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        periodStart: null,
        periodEnd: null,
        recipientName: null,
        detail: event.detail,
        performedBy: nameFor(event.actorAdminId, adminNames),
      })),
    ];
    events.sort((a, b) => b.at.getTime() - a.at.getTime());

    return {
      currency: invoices[0]?.currency ?? payments[0]?.currency ?? null,
      events,
    };
  }

  /** The recipient profile fields needed for the Care Recipients tab. */
  private async loadRecipientProfiles(
    userId: string | null,
    primaryRecipientId: string | null,
  ): Promise<
    { id: string; name: string; photoKey: string | null; relationship: string; status: string }[]
  > {
    const select = { id: true, name: true, photoKey: true, relationship: true, status: true };
    if (userId !== null) {
      return this.prisma.careRecipient.findMany({ where: { ownerId: userId }, select });
    }
    if (primaryRecipientId !== null) {
      const recipient = await this.prisma.careRecipient.findUnique({
        where: { id: primaryRecipientId },
        select,
      });
      return recipient === null ? [] : [recipient];
    }
    return [];
  }

  /** Resolve the care recipients billed under an entry (owned, or a linked contact). */
  private async resolveRecipients(
    userId: string | null,
    primaryRecipientId: string | null,
  ): Promise<{ id: string; name: string; createdAt: Date }[]> {
    if (userId !== null) {
      return this.prisma.careRecipient.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, createdAt: true },
      });
    }
    if (primaryRecipientId !== null) {
      const recipient = await this.prisma.careRecipient.findUnique({
        where: { id: primaryRecipientId },
        select: { id: true, name: true, createdAt: true },
      });
      return recipient === null ? [] : [recipient];
    }
    return [];
  }

  /** Merge the evidenced account events into one timeline, newest first. */
  private buildTimeline(
    invoices: { sequence: number; issuedAt: Date }[],
    payments: { amountMinor: number; methodLabel: string | null; receivedAt: Date }[],
    recipients: { name: string; createdAt: Date }[],
    revisions: { description: string; authorAdminId: string | null; createdAt: Date }[],
    accountEvents: {
      kind: 'ACCOUNT_DETAILS_EDITED' | 'REMINDER_SENT';
      detail: string | null;
      actorAdminId: string | null;
      createdAt: Date;
    }[],
    adminNames: Map<string, string>,
  ): BillingAccountEventView[] {
    const events: BillingAccountEventView[] = [
      ...payments.map((payment): BillingAccountEventView => ({
        type: 'PAYMENT_RECORDED',
        at: payment.receivedAt,
        amountMinor: payment.amountMinor,
        methodLabel: payment.methodLabel,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        recipientName: null,
        detail: null,
        actorName: null,
      })),
      ...invoices.map((invoice): BillingAccountEventView => ({
        type: 'INVOICE_ISSUED',
        at: invoice.issuedAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: invoice.sequence,
        invoiceIssuedAt: invoice.issuedAt,
        recipientName: null,
        detail: null,
        actorName: null,
      })),
      ...recipients.map((recipient): BillingAccountEventView => ({
        type: 'CARE_RECIPIENT_LINKED',
        at: recipient.createdAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        recipientName: recipient.name,
        detail: null,
        actorName: null,
      })),
      ...revisions.map((revision): BillingAccountEventView => ({
        type: 'CARE_PLAN_UPDATED',
        at: revision.createdAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        recipientName: null,
        detail: revision.description,
        actorName: nameFor(revision.authorAdminId, adminNames),
      })),
      ...accountEvents.map((event): BillingAccountEventView => ({
        type: event.kind,
        at: event.createdAt,
        amountMinor: null,
        methodLabel: null,
        invoiceSequence: null,
        invoiceIssuedAt: null,
        recipientName: null,
        detail: event.detail,
        actorName: nameFor(event.actorAdminId, adminNames),
      })),
    ];
    return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, TIMELINE_LIMIT);
  }

  /** Resolve admin ids to display names in one query. */
  private async resolveAdminNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    if (unique.length === 0) {
      return new Map();
    }
    const admins = await this.prisma.adminUser.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(admins.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]));
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
            where: { careRecipientId: { in: recipientIds }, refundedAt: null },
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
        createdAt: entry.createdAt,
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

/** Look up a resolved admin name, null when the id is unknown or absent. */
function nameFor(adminId: string | null, names: Map<string, string>): string | null {
  return adminId === null ? null : (names.get(adminId) ?? null);
}

/** The Invoices tab status: paid, else overdue past its due date, else awaiting payment. */
function invoiceDisplayStatus(
  status: 'PENDING' | 'PAID',
  dueDate: Date | null,
  now: Date,
): BillingAccountInvoiceRowView['status'] {
  if (status === 'PAID') {
    return 'PAID';
  }
  if (dueDate !== null && dueDate.getTime() < now.getTime()) {
    return 'OVERDUE';
  }
  return 'AWAITING_PAYMENT';
}

/** Whether a subscription is more current than another (active wins, then newest). */
function isMoreCurrent(
  candidate: { status: string; startDate: Date; createdAt: Date },
  existing: { status: string; startDate: Date; createdAt: Date },
): boolean {
  const candidateActive = candidate.status === 'ACTIVE';
  const existingActive = existing.status === 'ACTIVE';
  if (candidateActive !== existingActive) {
    return candidateActive;
  }
  if (candidate.startDate.getTime() !== existing.startDate.getTime()) {
    return candidate.startDate.getTime() > existing.startDate.getTime();
  }
  return candidate.createdAt.getTime() > existing.createdAt.getTime();
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
