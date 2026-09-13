import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoicePayment } from '../../domain/invoice-payment.entity';
import { InvoicePaymentRepository } from '../../domain/invoice-payment.repository';
import { TO_PERSISTENCE_CURRENCY } from './billing-enum.maps';

/** Prisma backed adapter for the InvoicePaymentRepository port (append only). */
@Injectable()
export class InvoicePaymentPrismaRepository implements InvoicePaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(payment: InvoicePayment): Promise<void> {
    await this.prisma.recipientInvoicePayment.create({
      data: {
        id: payment.id,
        careRecipientId: payment.careRecipientId,
        invoiceId: payment.invoiceId,
        amountMinor: payment.amountMinor,
        currency: TO_PERSISTENCE_CURRENCY[payment.currency],
        methodLabel: payment.methodLabel,
        receivedAt: payment.receivedAt,
        createdAt: payment.createdAt,
      },
    });
  }
}
