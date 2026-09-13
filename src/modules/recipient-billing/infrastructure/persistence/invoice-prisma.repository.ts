import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceLine } from '../../domain/invoice-line.entity';
import { Invoice } from '../../domain/invoice.entity';
import { InvoiceRepository } from '../../domain/invoice.repository';
import {
  TO_DOMAIN_CURRENCY,
  TO_DOMAIN_INVOICE_STATUS,
  TO_PERSISTENCE_CURRENCY,
  TO_PERSISTENCE_INVOICE_STATUS,
} from './billing-enum.maps';

/** Prisma backed adapter for the InvoiceRepository port. Owns the invoice lines. */
@Injectable()
export class InvoicePrismaRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(invoice: Invoice): Promise<void> {
    await this.prisma.recipientInvoice.create({
      data: {
        id: invoice.id,
        careRecipientId: invoice.careRecipientId,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        servicesLabel: invoice.servicesLabel,
        currency: TO_PERSISTENCE_CURRENCY[invoice.currency],
        amountMinor: invoice.amountMinor,
        insuranceCoveredMinor: invoice.insuranceCoveredMinor,
        status: TO_PERSISTENCE_INVOICE_STATUS[invoice.status],
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
        lines: {
          create: invoice.lines.map((line, index) => ({
            id: line.id,
            serviceName: line.serviceName,
            amountMinor: line.amountMinor,
            position: index,
          })),
        },
      },
    });
  }

  async save(invoice: Invoice): Promise<void> {
    await this.prisma.recipientInvoice.update({
      where: { id: invoice.id },
      data: { status: TO_PERSISTENCE_INVOICE_STATUS[invoice.status] },
    });
  }

  async findById(id: string): Promise<Invoice | null> {
    const row = await this.prisma.recipientInvoice.findUnique({
      where: { id },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (row === null) {
      return null;
    }
    return Invoice.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      servicesLabel: row.servicesLabel,
      currency: TO_DOMAIN_CURRENCY[row.currency],
      insuranceCoveredMinor: row.insuranceCoveredMinor,
      status: TO_DOMAIN_INVOICE_STATUS[row.status],
      issuedAt: row.issuedAt,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      lines: row.lines.map((line) =>
        InvoiceLine.create({
          id: line.id,
          serviceName: line.serviceName,
          amountMinor: line.amountMinor,
        }),
      ),
    });
  }
}
