import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency, Prisma } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ApplyCreditCommand, InvoiceCreditWriter } from '../../domain/invoice-credit-writer';

const TO_PRISMA_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.NigerianNaira]: PrismaCurrency.NGN,
  [Currency.UnitedStatesDollar]: PrismaCurrency.USD,
};

/**
 * Prisma adapter that records a credit as a non cash settlement payment against an
 * invoice and recomputes the invoice status, and removes it on reversal. The settlement
 * carries the approved adjustment id so it is excluded from cash collection reads.
 */
@Injectable()
export class InvoiceCreditWriterPrisma implements InvoiceCreditWriter {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async applyCredit(command: ApplyCreditCommand): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.recipientInvoice.findUnique({
        where: { id: command.invoiceId },
        select: { careRecipientId: true },
      });
      if (invoice === null) {
        return;
      }
      await tx.recipientInvoicePayment.create({
        data: {
          id: this.ids.generate(),
          careRecipientId: invoice.careRecipientId,
          invoiceId: command.invoiceId,
          amountMinor: command.amountMinor,
          currency: TO_PRISMA_CURRENCY[command.currency],
          methodLabel: 'Platform Credit',
          receivedAt: command.now,
          creditAdjustmentId: command.adjustmentId,
        },
      });
      await recomputeInvoiceStatus(tx, command.invoiceId);
    });
  }

  async removeCredit(adjustmentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const credit = await tx.recipientInvoicePayment.findUnique({
        where: { creditAdjustmentId: adjustmentId },
        select: { id: true, invoiceId: true },
      });
      if (credit === null) {
        return;
      }
      await tx.recipientInvoicePayment.delete({ where: { id: credit.id } });
      if (credit.invoiceId !== null) {
        await recomputeInvoiceStatus(tx, credit.invoiceId);
      }
    });
  }
}

/** Settle or reopen the invoice from its remaining net payments (credit included). */
async function recomputeInvoiceStatus(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.recipientInvoice.findUnique({
    where: { id: invoiceId },
    select: { amountMinor: true, insuranceCoveredMinor: true },
  });
  if (invoice === null) {
    return;
  }
  const paid = await tx.recipientInvoicePayment.aggregate({
    where: { invoiceId },
    _sum: { amountMinor: true, refundedAmountMinor: true },
  });
  const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
  const netPaid = (paid._sum.amountMinor ?? 0) - (paid._sum.refundedAmountMinor ?? 0);
  await tx.recipientInvoice.update({
    where: { id: invoiceId },
    data: { status: netPaid >= patientDue ? 'PAID' : 'PENDING' },
  });
}
