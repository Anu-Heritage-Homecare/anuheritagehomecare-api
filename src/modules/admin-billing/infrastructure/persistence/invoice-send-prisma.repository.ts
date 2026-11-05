import { Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceSendRepository, InvoiceSendTarget } from '../../domain/invoice-send.repository';

/** Prisma adapter for sending a raised invoice to its billing client. */
@Injectable()
export class InvoiceSendPrismaRepository implements InvoiceSendRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadForSend(invoiceId: string): Promise<InvoiceSendTarget | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        sequence: true,
        issuedAt: true,
        amountMinor: true,
        currency: true,
        dueDate: true,
        careRecipientId: true,
        careRecipient: { select: { name: true, ownerId: true } },
      },
    });
    if (invoice === null) {
      return null;
    }

    // The billing client is the family owner; the invoice carries only the recipient.
    const [owner, entry] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: invoice.careRecipient.ownerId },
        select: { firstName: true, lastName: true, email: true },
      }),
      this.prisma.familyDirectoryEntry.findFirst({
        where: {
          OR: [
            { userId: invoice.careRecipient.ownerId },
            { primaryRecipientId: invoice.careRecipientId },
          ],
        },
        select: { accountName: true },
      }),
    ]);

    return {
      invoiceId: invoice.id,
      sequence: invoice.sequence,
      issuedAt: invoice.issuedAt,
      amountMinor: invoice.amountMinor,
      currency: invoice.currency === 'NGN' ? Currency.NigerianNaira : Currency.UnitedStatesDollar,
      dueDate: invoice.dueDate,
      accountName: entry?.accountName ?? null,
      clientName:
        owner !== null ? `${owner.firstName} ${owner.lastName}` : invoice.careRecipient.name,
      clientEmail: owner?.email ?? null,
    };
  }

  async markSent(invoiceId: string, sentAt: Date): Promise<void> {
    await this.prisma.recipientInvoice.update({
      where: { id: invoiceId },
      data: { sentAt },
    });
  }
}
