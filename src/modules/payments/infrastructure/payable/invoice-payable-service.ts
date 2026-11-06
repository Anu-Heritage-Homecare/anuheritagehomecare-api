import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { PayableType } from '../../domain/payable-type.enum';
import { PayableService, PayableSummary } from '../../application/ports/payable-service.port';

const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  NGN: Currency.NigerianNaira,
  USD: Currency.UnitedStatesDollar,
};

/**
 * PayableService for recipient invoices: reads the outstanding balance to charge
 * online, and on a confirmed charge records the payment against the invoice and
 * settles it. Writes the recipient invoicing tables directly (the shared store the
 * admin billing reads), so it stays independent of the admin billing module.
 */
@Injectable()
export class InvoicePayableService implements PayableService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async load(payableType: PayableType, payableId: string): Promise<PayableSummary | null> {
    if (payableType !== PayableType.Invoice) {
      return null;
    }
    const balance = await this.balance(payableId);
    if (balance === null) {
      return null;
    }
    return {
      ownerId: balance.ownerId,
      currency: balance.currency,
      amountMinor: balance.balanceMinor,
      alreadyPaid: balance.alreadyPaid,
      recurring: null,
    };
  }

  async markPaid(payableType: PayableType, payableId: string): Promise<void> {
    if (payableType !== PayableType.Invoice) {
      return;
    }
    const balance = await this.balance(payableId);
    if (balance === null || balance.alreadyPaid || balance.balanceMinor <= 0) {
      return;
    }
    await this.prisma.recipientInvoicePayment.create({
      data: {
        id: this.ids.generate(),
        invoiceId: payableId,
        careRecipientId: balance.careRecipientId,
        amountMinor: balance.balanceMinor,
        currency: balance.prismaCurrency,
        methodLabel: 'Online Payment',
        receivedAt: this.clock.now(),
      },
    });
    await this.prisma.recipientInvoice.update({
      where: { id: payableId },
      data: { status: 'PAID' },
    });
  }

  private async balance(invoiceId: string): Promise<{
    ownerId: string;
    careRecipientId: string;
    currency: Currency;
    prismaCurrency: PrismaCurrency;
    balanceMinor: number;
    alreadyPaid: boolean;
  } | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        careRecipientId: true,
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
    const paid = await this.prisma.recipientInvoicePayment.aggregate({
      where: { invoiceId },
      _sum: { amountMinor: true },
    });
    const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
    return {
      ownerId: invoice.careRecipient.ownerId,
      careRecipientId: invoice.careRecipientId,
      currency: TO_DOMAIN_CURRENCY[invoice.currency],
      prismaCurrency: invoice.currency,
      balanceMinor: Math.max(0, patientDue - (paid._sum.amountMinor ?? 0)),
      alreadyPaid: invoice.status === 'PAID',
    };
  }
}
