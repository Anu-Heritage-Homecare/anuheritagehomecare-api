import { Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  InvoiceReminderContext,
  InvoiceReminderGateway,
} from '../../domain/invoice-reminder.gateway';

/** Prisma adapter loading the facts a payment reminder is built and addressed from. */
@Injectable()
export class InvoiceReminderGatewayPrisma implements InvoiceReminderGateway {
  constructor(private readonly prisma: PrismaService) {}

  async loadReminderContext(invoiceId: string): Promise<InvoiceReminderContext | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        sequence: true,
        issuedAt: true,
        amountMinor: true,
        insuranceCoveredMinor: true,
        currency: true,
        dueDate: true,
        careRecipient: { select: { ownerId: true } },
      },
    });
    if (invoice === null) {
      return null;
    }

    const [owner, paid] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: invoice.careRecipient.ownerId },
        select: { email: true },
      }),
      this.prisma.recipientInvoicePayment.aggregate({
        where: { invoiceId },
        _sum: { amountMinor: true, refundedAmountMinor: true },
      }),
    ]);

    const patientDue = Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
    const netPaid = (paid._sum.amountMinor ?? 0) - (paid._sum.refundedAmountMinor ?? 0);
    return {
      invoiceId: invoice.id,
      invoiceNumber: `INV-${invoice.issuedAt.getUTCFullYear()}-${String(invoice.sequence).padStart(3, '0')}`,
      currency: invoice.currency === 'NGN' ? Currency.NigerianNaira : Currency.UnitedStatesDollar,
      amountDueMinor: Math.max(0, patientDue - netPaid),
      dueDate: invoice.dueDate,
      clientEmail: owner?.email ?? null,
    };
  }
}
