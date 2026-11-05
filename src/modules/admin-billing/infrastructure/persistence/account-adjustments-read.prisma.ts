import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AccountAdjustmentCategory,
  adjustmentReference,
} from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import {
  AccountAdjustmentCounts,
  AccountAdjustmentRowView,
  AccountAdjustmentsFilter,
  AccountAdjustmentsReadModel,
  AccountAdjustmentsView,
} from '../../application/ports/account-adjustments-read.port';

/** The display row plus its derived reference, which search also matches on. */
interface AdjustmentItem {
  view: AccountAdjustmentRowView;
  reference: string;
}

/**
 * Prisma read model for the Credits & Adjustments list. Loads every adjustment, resolves
 * each billing account name from the family directory, then applies the search, filters,
 * tab counts and paging in memory.
 *
 * shortcut: in memory aggregation over every adjustment, fine for an agency's volume;
 * push the amount, status and category filters into the query if adjustments reach the
 * tens of thousands.
 */
@Injectable()
export class AccountAdjustmentsReadPrisma implements AccountAdjustmentsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: AccountAdjustmentsFilter): Promise<AccountAdjustmentsView> {
    const adjustments = await this.prisma.accountAdjustment.findMany({
      orderBy: { sequence: 'desc' },
      select: {
        id: true,
        sequence: true,
        category: true,
        type: true,
        billingAccountId: true,
        amountMinor: true,
        currency: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    });

    const accountNames = await this.resolveAccountNames([
      ...new Set(adjustments.map((a) => a.billingAccountId)),
    ]);

    const items: AdjustmentItem[] = adjustments.map((a) => {
      const category = a.category as unknown as AccountAdjustmentCategory;
      return {
        view: {
          id: a.id,
          sequence: a.sequence,
          category,
          type: a.type,
          billingAccountId: a.billingAccountId,
          billingAccountName: accountNames.get(a.billingAccountId) ?? null,
          amountMinor: a.amountMinor,
          currency: a.currency,
          reason: a.reason,
          status: a.status as unknown as AccountAdjustmentStatus,
          createdAt: a.createdAt,
        },
        reference: adjustmentReference(category, a.sequence, a.createdAt),
      };
    });

    const types = [...new Set(items.map((i) => i.view.type))].sort((a, b) => a.localeCompare(b));

    // Tab counts reflect the search and other filters, never the active category tab.
    const scoped = items.filter(
      (i) =>
        matchesSearch(i, filter.search) &&
        matchesStatus(i.view, filter.status) &&
        matchesType(i.view, filter.type) &&
        matchesAmount(i.view, filter.minAmountMinor, filter.maxAmountMinor),
    );
    const counts: AccountAdjustmentCounts = {
      credits: scoped.filter((i) => i.view.category === AccountAdjustmentCategory.Credit).length,
      refunds: scoped.filter((i) => i.view.category === AccountAdjustmentCategory.Refund).length,
      writeOffs: scoped.filter((i) => i.view.category === AccountAdjustmentCategory.WriteOff)
        .length,
      adjustments: scoped.filter((i) => i.view.category === AccountAdjustmentCategory.Adjustment)
        .length,
    };

    const filtered = scoped.filter(
      (i) => filter.category === null || i.view.category === filter.category,
    );

    const start = Math.max(0, (filter.page - 1) * filter.pageSize);
    return {
      rows: filtered.slice(start, start + filter.pageSize).map((i) => i.view),
      total: filtered.length,
      counts,
      types,
    };
  }

  /** Map each billing account id to its display name (account name, else the contact). */
  private async resolveAccountNames(accountIds: string[]): Promise<Map<string, string>> {
    if (accountIds.length === 0) {
      return new Map();
    }
    const entries = await this.prisma.familyDirectoryEntry.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, accountName: true, fullName: true, userId: true },
    });
    const userIds = entries.map((e) => e.userId).filter((id): id is string => id !== null);
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          });
    const userById = new Map(users.map((u) => [u.id, u]));

    return new Map(
      entries.map((entry) => {
        const user = entry.userId === null ? undefined : userById.get(entry.userId);
        const contact =
          user === undefined ? entry.fullName : `${user.firstName} ${user.lastName}`.trim();
        return [entry.id, entry.accountName ?? contact];
      }),
    );
  }
}

function matchesSearch(item: AdjustmentItem, search: string | null): boolean {
  if (search === null) {
    return true;
  }
  const needle = search.toLowerCase();
  return (
    item.reference.toLowerCase().includes(needle) ||
    (item.view.billingAccountName ?? '').toLowerCase().includes(needle) ||
    item.view.reason.toLowerCase().includes(needle)
  );
}

function matchesStatus(
  view: AccountAdjustmentRowView,
  status: AccountAdjustmentStatus | null,
): boolean {
  return status === null || view.status === status;
}

function matchesType(view: AccountAdjustmentRowView, type: string | null): boolean {
  return type === null || view.type === type;
}

function matchesAmount(
  view: AccountAdjustmentRowView,
  min: number | null,
  max: number | null,
): boolean {
  if (min !== null && view.amountMinor < min) {
    return false;
  }
  return max === null || view.amountMinor <= max;
}
