import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Currency } from '@shared/domain/currency.enum';
import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import { AccountAdjustment } from '../../domain/account-adjustment.entity';
import {
  AccountAdjustmentRepository,
  CreditableInvoice,
} from '../../domain/account-adjustment.repository';

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
        invoiceId: adjustment.invoiceId,
        amountMinor: adjustment.amountMinor,
        currency: adjustment.currency,
        status: adjustment.status,
        reason: adjustment.reason,
        notes: adjustment.notes,
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
      invoiceId: row.invoiceId,
      amountMinor: row.amountMinor,
      currency: row.currency as unknown as Currency,
      status: row.status as unknown as AccountAdjustmentStatus,
      reason: row.reason,
      notes: row.notes,
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

  async loadCreditableInvoice(
    billingAccountId: string,
    invoiceId: string,
  ): Promise<CreditableInvoice | null> {
    const [account, invoice] = await Promise.all([
      this.prisma.familyDirectoryEntry.findUnique({
        where: { id: billingAccountId },
        select: { userId: true, primaryRecipientId: true },
      }),
      this.prisma.recipientInvoice.findUnique({
        where: { id: invoiceId },
        select: {
          amountMinor: true,
          insuranceCoveredMinor: true,
          currency: true,
          careRecipientId: true,
          careRecipient: { select: { ownerId: true } },
        },
      }),
    ]);
    if (account === null || invoice === null) {
      return null;
    }
    // The invoice must belong to this billing account (owner or its primary recipient).
    const belongsToAccount =
      (account.userId !== null && account.userId === invoice.careRecipient.ownerId) ||
      (account.primaryRecipientId !== null &&
        account.primaryRecipientId === invoice.careRecipientId);
    if (!belongsToAccount) {
      return null;
    }
    const paid = await this.prisma.recipientInvoicePayment.aggregate({
      where: { invoiceId },
      _sum: { amountMinor: true, refundedAmountMinor: true },
    });
    const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
    const netPaid = (paid._sum.amountMinor ?? 0) - (paid._sum.refundedAmountMinor ?? 0);
    return {
      careRecipientId: invoice.careRecipientId,
      currency: invoice.currency as unknown as Currency,
      outstandingMinor: Math.max(0, patientDue - netPaid),
    };
  }
}
