import { Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceWriteRepository, NewInvoice } from '../../domain/invoice-write.repository';

/** Prisma adapter for raising a recipient invoice with its lines and adjustments. */
@Injectable()
export class InvoiceWritePrismaRepository implements InvoiceWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recipientExists(careRecipientId: string): Promise<boolean> {
    const recipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      select: { id: true },
    });
    return recipient !== null;
  }

  async create(invoice: NewInvoice): Promise<{ id: string; sequence: number }> {
    const currency =
      invoice.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    // One nested create: the invoice, its service lines and its adjustments are written
    // atomically in a single statement.
    return this.prisma.recipientInvoice.create({
      data: {
        careRecipientId: invoice.careRecipientId,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        servicesLabel: invoice.servicesLabel,
        currency,
        amountMinor: invoice.amountMinor,
        insuranceCoveredMinor: invoice.insuranceCoveredMinor,
        subtotalMinor: invoice.subtotalMinor,
        discountTotalMinor: invoice.discountTotalMinor,
        taxMinor: invoice.taxMinor,
        taxRateBasisPoints: invoice.taxRateBasisPoints,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        lines: {
          create: invoice.lines.map((line) => ({
            serviceName: line.serviceName,
            amountMinor: line.amountMinor,
            position: line.position,
            rateMinor: line.rateMinor,
            quantity: line.quantity,
            unitLabel: line.unitLabel,
            category: line.category,
            serviceDateStart: line.serviceDateStart,
            serviceDateEnd: line.serviceDateEnd,
            caregiverId: line.caregiverId,
          })),
        },
        adjustments: {
          create: invoice.adjustments.map((adjustment) => ({
            kind: adjustment.kind,
            label: adjustment.label,
            amountMinor: adjustment.amountMinor,
            position: adjustment.position,
          })),
        },
      },
      select: { id: true, sequence: true },
    });
  }
}
