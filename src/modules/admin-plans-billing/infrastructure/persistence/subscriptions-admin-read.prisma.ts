import { Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  EnrichedSubscriptionPageView,
  SubscriptionDetailView,
  SubscriptionKpisView,
  SubscriptionsAdminReadModel,
} from '../../application/ports/subscriptions-admin-read.port';
import { nextMonthlyRenewal } from '../../application/renewal-schedule';

const DAY_MS = 86_400_000;
const RENEWING_SOON_DAYS = 14;
const EXPIRING_DAYS = 30;
/** Active subscriptions scanned when deriving the renewing soon and expiring KPIs. */
const KPI_SCAN_LIMIT = 2000;

/**
 * Prisma read model for the Active Subscriptions table and its KPI bar. Composes the
 * subscription with the operational overlay (subscription_ops), the recipient and the
 * resolved coordinator and caregiver names. Currency scoped.
 */
@Injectable()
export class SubscriptionsAdminReadPrisma implements SubscriptionsAdminReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listEnriched(
    currency: PrismaCurrency,
    status: PrismaSubscriptionStatus | null,
    page: number,
    pageSize: number,
  ): Promise<EnrichedSubscriptionPageView> {
    const where = { currency, ...(status === null ? {} : { status }) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
        select: {
          id: true,
          ownerId: true,
          careRecipientId: true,
          planType: true,
          status: true,
          autoRenew: true,
          startDate: true,
          monthlyPriceMinor: true,
        },
      }),
    ]);

    const ops = await this.prisma.subscriptionOps.findMany({
      where: { subscriptionId: { in: rows.map((row) => row.id) } },
      select: {
        subscriptionId: true,
        coordinatorId: true,
        caregiverId: true,
        flexAllocatedTenths: true,
        flexConsumedTenths: true,
      },
    });
    const opsBySub = new Map(ops.map((entry) => [entry.subscriptionId, entry]));

    const [recipients, owners, coordinatorNames, caregiverNames] = await Promise.all([
      this.recipients(rows.map((row) => row.careRecipientId)),
      this.userNames(rows.map((row) => row.ownerId)),
      this.adminNames(ops.map((entry) => entry.coordinatorId)),
      this.userNames(ops.map((entry) => entry.caregiverId)),
    ]);

    return {
      total,
      rows: rows.map((row) => {
        const overlay = opsBySub.get(row.id);
        const recipient = recipients.get(row.careRecipientId);
        return {
          id: row.id,
          recipientName: recipient?.name ?? null,
          recipientDateOfBirth: recipient?.dateOfBirth ?? null,
          accountHolderName: owners.get(row.ownerId) ?? null,
          planType: row.planType,
          status: row.status,
          autoRenew: row.autoRenew,
          startDate: row.startDate,
          monthlyPriceMinor: row.monthlyPriceMinor,
          coordinatorName:
            overlay?.coordinatorId == null
              ? null
              : (coordinatorNames.get(overlay.coordinatorId) ?? null),
          caregiverName:
            overlay?.caregiverId == null ? null : (caregiverNames.get(overlay.caregiverId) ?? null),
          flexAllocatedTenths: overlay?.flexAllocatedTenths ?? null,
          flexConsumedTenths: overlay?.flexConsumedTenths ?? null,
        };
      }),
    };
  }

  async subscriptionKpis(currency: PrismaCurrency, now: Date): Promise<SubscriptionKpisView> {
    const soonCutoff = new Date(now.getTime() + RENEWING_SOON_DAYS * DAY_MS);
    const expiringCutoff = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS);

    const [counts, activeRows] = await Promise.all([
      this.prisma.subscription.groupBy({
        by: ['status'],
        where: { currency },
        _count: { _all: true },
      }),
      this.prisma.subscription.findMany({
        where: { currency, status: PrismaSubscriptionStatus.ACTIVE },
        take: KPI_SCAN_LIMIT,
        select: { startDate: true, autoRenew: true },
      }),
    ]);
    const byStatus = new Map(counts.map((row) => [row.status, row._count._all]));

    let renewingSoon = 0;
    let expiring = 0;
    for (const row of activeRows) {
      const renewal = nextMonthlyRenewal(row.startDate, now).getTime();
      if (renewal <= soonCutoff.getTime()) {
        renewingSoon += 1;
      }
      if (!row.autoRenew && renewal <= expiringCutoff.getTime()) {
        expiring += 1;
      }
    }

    return {
      totalActive: byStatus.get(PrismaSubscriptionStatus.ACTIVE) ?? 0,
      paused: byStatus.get(PrismaSubscriptionStatus.PAUSED) ?? 0,
      pendingActivation: byStatus.get(PrismaSubscriptionStatus.PENDING_PAYMENT) ?? 0,
      cancelled: byStatus.get(PrismaSubscriptionStatus.CANCELLED) ?? 0,
      renewingSoon,
      expiring,
      activeScanned: activeRows.length,
      activeTotal: byStatus.get(PrismaSubscriptionStatus.ACTIVE) ?? 0,
    };
  }

  async subscriptionDetail(id: string): Promise<SubscriptionDetailView | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        careRecipientId: true,
        planType: true,
        status: true,
        autoRenew: true,
        monthlyPriceMinor: true,
        currency: true,
        startDate: true,
      },
    });
    if (subscription === null) {
      return null;
    }

    const [recipient, owner, overlay, payments] = await Promise.all([
      this.prisma.careRecipient.findUnique({
        where: { id: subscription.careRecipientId },
        select: { name: true, dateOfBirth: true, gender: true, medicalConditions: true },
      }),
      this.prisma.user.findUnique({
        where: { id: subscription.ownerId },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      }),
      this.prisma.subscriptionOps.findUnique({
        where: { subscriptionId: id },
        include: {
          events: { orderBy: { occurredAt: 'desc' } },
          notes: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.payment.findMany({
        where: { payableType: 'SUBSCRIPTION', payableId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          providerReference: true,
          provider: true,
          payableType: true,
          amountMinor: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const [coordinatorName, caregiverName] = await Promise.all([
      overlay?.coordinatorId == null
        ? Promise.resolve(null)
        : this.singleAdminName(overlay.coordinatorId),
      overlay?.caregiverId == null
        ? Promise.resolve(null)
        : this.singleUserName(overlay.caregiverId),
    ]);

    return {
      id: subscription.id,
      planType: subscription.planType,
      status: subscription.status,
      autoRenew: subscription.autoRenew,
      monthlyPriceMinor: subscription.monthlyPriceMinor,
      currencyCode: subscription.currency,
      startDate: subscription.startDate,
      recipientName: recipient?.name ?? null,
      recipientDateOfBirth: recipient?.dateOfBirth ?? null,
      recipientGender: recipient === null ? null : titleCase(recipient.gender),
      recipientConditions: recipient?.medicalConditions ?? [],
      ownerName: owner === null ? null : `${owner.firstName} ${owner.lastName}`.trim(),
      ownerPhone: owner?.phone ?? null,
      ownerEmail: owner?.email ?? null,
      ownerAddress: owner === null ? null : formatAddress(owner),
      coordinatorName,
      caregiverName,
      contractStartAt: overlay?.contractStartAt ?? null,
      activatedAt: overlay?.activatedAt ?? null,
      flexAllocatedTenths: overlay?.flexAllocatedTenths ?? null,
      flexConsumedTenths: overlay?.flexConsumedTenths ?? null,
      flexCycleEndsAt: overlay?.flexCycleEndsAt ?? null,
      hasOverlay: overlay !== null,
      events: (overlay?.events ?? []).map((event) => ({
        type: event.type,
        detail: event.detail,
        hoursDeltaTenths: event.hoursDeltaTenths,
        actorAdminId: event.actorAdminId,
        actorLabel: event.actorLabel,
        occurredAt: event.occurredAt,
      })),
      notes: (overlay?.notes ?? []).map((note) => ({
        body: note.body,
        authorAdminId: note.authorAdminId,
        authorName: note.authorName,
        createdAt: note.createdAt,
      })),
      payments: payments.map((payment) => ({
        reference: payment.providerReference,
        provider: payment.provider,
        payableType: payment.payableType,
        amountMinor: payment.amountMinor,
        status: payment.status,
        createdAt: payment.createdAt,
      })),
    };
  }

  private async singleAdminName(id: string): Promise<string | null> {
    const names = await this.adminNames([id]);
    return names.get(id) ?? null;
  }

  private async singleUserName(id: string): Promise<string | null> {
    const names = await this.userNames([id]);
    return names.get(id) ?? null;
  }

  private async recipients(
    ids: string[],
  ): Promise<Map<string, { name: string; dateOfBirth: Date | null }>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.careRecipient.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, dateOfBirth: true },
    });
    return new Map(rows.map((row) => [row.id, { name: row.name, dateOfBirth: row.dateOfBirth }]));
  }

  private async userNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  }

  private async adminNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.adminUser.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  }
}

/** Turn an UPPER_SNAKE enum value into a Title Cased display string. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/** One line address from a user's structured address fields. */
function formatAddress(owner: {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
}): string {
  const line2 = owner.addressLine2 === null ? '' : `${owner.addressLine2}, `;
  return `${owner.addressLine1}, ${line2}${owner.city}, ${owner.state} ${owner.postalCode}`;
}
