import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Currency } from '@shared/domain/currency.enum';
import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import { AccountAdjustment } from '../../domain/account-adjustment.entity';
import { AccountAdjustmentRepository } from '../../domain/account-adjustment.repository';

/** Prisma backed adapter for the AccountAdjustmentRepository port. */
@Injectable()
export class AccountAdjustmentPrismaRepository implements AccountAdjustmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(adjustment: AccountAdjustment): Promise<number> {
    const row = await this.prisma.accountAdjustment.create({
      data: {
        id: adjustment.id,
        // Domain and Prisma enums share the same string values.
        category: adjustment.category,
        type: adjustment.type,
        billingAccountId: adjustment.billingAccountId,
        amountMinor: adjustment.amountMinor,
        currency: adjustment.currency,
        status: adjustment.status,
        reason: adjustment.reason,
        createdById: adjustment.createdById,
        createdAt: adjustment.createdAt,
      },
      select: { sequence: true },
    });
    return row.sequence;
  }

  async update(adjustment: AccountAdjustment): Promise<void> {
    await this.prisma.accountAdjustment.update({
      where: { id: adjustment.id },
      data: {
        status: adjustment.status,
        approvedById: adjustment.approvedById,
        approvedAt: adjustment.approvedAt,
        reversedById: adjustment.reversedById,
        reversedAt: adjustment.reversedAt,
      },
    });
  }

  async findById(id: string): Promise<AccountAdjustment | null> {
    const row = await this.prisma.accountAdjustment.findUnique({ where: { id } });
    if (row === null) {
      return null;
    }
    return AccountAdjustment.fromPersistence(row.id, {
      category: row.category as unknown as AccountAdjustmentCategory,
      type: row.type,
      billingAccountId: row.billingAccountId,
      amountMinor: row.amountMinor,
      currency: row.currency as unknown as Currency,
      status: row.status as unknown as AccountAdjustmentStatus,
      reason: row.reason,
      createdById: row.createdById,
      createdAt: row.createdAt,
      approvedById: row.approvedById,
      approvedAt: row.approvedAt,
      reversedById: row.reversedById,
      reversedAt: row.reversedAt,
    });
  }

  async billingAccountExists(billingAccountId: string): Promise<boolean> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id: billingAccountId },
      select: { id: true },
    });
    return entry !== null;
  }
}
