import { Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  InvoicePayable,
  InvoicePaymentContext,
  InvoicePaymentWriteRepository,
  NewInvoicePayment,
} from '../../domain/invoice-payment-write.repository';

const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  NGN: Currency.NigerianNaira,
  USD: Currency.UnitedStatesDollar,
};
const TO_PRISMA_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.NigerianNaira]: PrismaCurrency.NGN,
  [Currency.UnitedStatesDollar]: PrismaCurrency.USD,
};

/** Prisma adapter for recording invoice payments and settling the invoice. */
@Injectable()
export class InvoicePaymentWritePrismaRepository implements InvoicePaymentWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadForPayment(invoiceId: string): Promise<InvoicePaymentContext | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        careRecipientId: true,
        currency: true,
        amountMinor: true,
        insuranceCoveredMinor: true,
        status: true,
      },
    });
    if (invoice === null) {
      return null;
    }
    const paid = await this.prisma.recipientInvoicePayment.aggregate({
      where: { invoiceId },
      _sum: { amountMinor: true, refundedAmountMinor: true },
    });
    return {
      careRecipientId: invoice.careRecipientId,
      currency: TO_DOMAIN_CURRENCY[invoice.currency],
      patientDueMinor: Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor),
      paidMinor: netPaid(paid._sum),
      alreadyPaid: invoice.status === 'PAID',
    };
  }

  async loadPayable(invoiceId: string): Promise<InvoicePayable | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        currency: true,
        amountMinor: true,
        insuranceCoveredMinor: true,
        status: true,
        careRecipient: { select: { ownerId: true } },
      },
    });
    if (invoice === null) {
      return null;
    }
    // ownerId references the identity User aggregate by id across contexts.
    const [owner, paid] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: invoice.careRecipient.ownerId },
        select: { id: true, email: true },
      }),
      this.prisma.recipientInvoicePayment.aggregate({
        where: { invoiceId },
        _sum: { amountMinor: true, refundedAmountMinor: true },
      }),
    ]);
    if (owner === null) {
      return null;
    }
    const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
    return {
      ownerId: owner.id,
      ownerEmail: owner.email,
      currency: TO_DOMAIN_CURRENCY[invoice.currency],
      balanceMinor: Math.max(0, patientDue - netPaid(paid._sum)),
      alreadyPaid: invoice.status === 'PAID',
    };
  }

  async record(payment: NewInvoicePayment): Promise<void> {
    await this.prisma.recipientInvoicePayment.create({
      data: {
        id: payment.id,
        invoiceId: payment.invoiceId,
        careRecipientId: payment.careRecipientId,
        amountMinor: payment.amountMinor,
        currency: TO_PRISMA_CURRENCY[payment.currency],
        methodLabel: payment.methodLabel,
        receivedAt: payment.receivedAt,
        referenceNumber: payment.referenceNumber,
        bankName: payment.bankName,
        notes: payment.notes,
      },
    });
  }

  async markPaid(invoiceId: string): Promise<void> {
    await this.prisma.recipientInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' },
    });
  }

  async loadRecordedPayment(paymentId: string): Promise<{
    invoiceId: string | null;
    amountMinor: number;
    refundedAmountMinor: number;
  } | null> {
    // A credit settlement (creditAdjustmentId set) is not a cash payment and cannot be
    // refunded; it is reversed through its adjustment instead.
    const payment = await this.prisma.recipientInvoicePayment.findFirst({
      where: { id: paymentId, creditAdjustmentId: null },
      select: { invoiceId: true, amountMinor: true, refundedAmountMinor: true },
    });
    if (payment === null) {
      return null;
    }
    return {
      invoiceId: payment.invoiceId,
      amountMinor: payment.amountMinor,
      refundedAmountMinor: payment.refundedAmountMinor,
    };
  }

  async refund(params: {
    paymentId: string;
    amountMinor: number;
    method: string | null;
    reason: string | null;
    notes: string | null;
    adminId: string;
    now: Date;
  }): Promise<void> {
    const invoiceId = await this.prisma.$transaction(async (tx) => {
      await tx.paymentRefund.create({
        data: {
          paymentId: params.paymentId,
          amountMinor: params.amountMinor,
          method: params.method,
          reason: params.reason,
          notes: params.notes,
          refundedByAdminId: params.adminId,
        },
      });
      const payment = await tx.recipientInvoicePayment.update({
        where: { id: params.paymentId },
        data: {
          refundedAmountMinor: { increment: params.amountMinor },
          refundReason: params.reason,
          refundedByAdminId: params.adminId,
        },
        select: { invoiceId: true, amountMinor: true, refundedAmountMinor: true },
      });
      // Mark the payment fully reversed once the refunds reach its amount.
      if (payment.refundedAmountMinor >= payment.amountMinor) {
        await tx.recipientInvoicePayment.update({
          where: { id: params.paymentId },
          data: { refundedAt: params.now },
        });
      }
      return payment.invoiceId;
    });

    if (invoiceId !== null) {
      await this.recomputeInvoiceStatus(invoiceId);
    }
  }

  /** Reopen or settle an invoice from its remaining net payments after a refund. */
  private async recomputeInvoiceStatus(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: { amountMinor: true, insuranceCoveredMinor: true },
    });
    if (invoice === null) {
      return;
    }
    const paid = await this.prisma.recipientInvoicePayment.aggregate({
      where: { invoiceId },
      _sum: { amountMinor: true, refundedAmountMinor: true },
    });
    const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
    await this.prisma.recipientInvoice.update({
      where: { id: invoiceId },
      data: { status: netPaid(paid._sum) >= patientDue ? 'PAID' : 'PENDING' },
    });
  }
}

/** Net paid in minor units: gross received less everything refunded. */
function netPaid(sum: { amountMinor: number | null; refundedAmountMinor: number | null }): number {
  return (sum.amountMinor ?? 0) - (sum.refundedAmountMinor ?? 0);
}
