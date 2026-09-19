import { Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  EnrichedSubscriptionPageView,
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
