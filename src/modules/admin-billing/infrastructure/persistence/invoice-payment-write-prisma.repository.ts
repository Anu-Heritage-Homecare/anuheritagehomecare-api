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
      where: { invoiceId, refundedAt: null },
      _sum: { amountMinor: true },
    });
    return {
      careRecipientId: invoice.careRecipientId,
      currency: TO_DOMAIN_CURRENCY[invoice.currency],
      patientDueMinor: Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor),
      paidMinor: paid._sum.amountMinor ?? 0,
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
        where: { invoiceId, refundedAt: null },
        _sum: { amountMinor: true },
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
      balanceMinor: Math.max(0, patientDue - (paid._sum.amountMinor ?? 0)),
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

  async loadRecordedPayment(
    paymentId: string,
  ): Promise<{ invoiceId: string | null; alreadyRefunded: boolean } | null> {
    const payment = await this.prisma.recipientInvoicePayment.findUnique({
      where: { id: paymentId },
      select: { invoiceId: true, refundedAt: true },
    });
    if (payment === null) {
      return null;
    }
    return { invoiceId: payment.invoiceId, alreadyRefunded: payment.refundedAt !== null };
  }

  async refund(params: {
    paymentId: string;
    reason: string | null;
    adminId: string;
    now: Date;
  }): Promise<void> {
    const payment = await this.prisma.recipientInvoicePayment.update({
      where: { id: params.paymentId },
      data: {
        refundedAt: params.now,
        refundReason: params.reason,
        refundedByAdminId: params.adminId,
      },
      select: { invoiceId: true },
    });
    // Reopen the invoice the refund unsettles; its display status recomputes from the
    // remaining (non refunded) payments.
    if (payment.invoiceId !== null) {
      await this.prisma.recipientInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'PENDING' },
      });
    }
  }
}
