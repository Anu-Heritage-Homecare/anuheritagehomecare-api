import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  DeleteDraftInvoiceOutcome,
  InvoiceDeleteRepository,
} from '../../domain/invoice-delete.repository';

/**
 * Prisma adapter that hard deletes a draft invoice. The check and delete run in one
 * transaction so a sent or paid invoice is never removed. Deleting the invoice cascades
 * its lines, adjustments, notes, attachments and events (all onDelete: Cascade).
 */
@Injectable()
export class InvoiceDeletePrismaRepository implements InvoiceDeleteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async deleteIfDraft(invoiceId: string): Promise<DeleteDraftInvoiceOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.recipientInvoice.findUnique({
        where: { id: invoiceId },
        select: { status: true, sentAt: true },
      });
      if (invoice === null) {
        return 'NOT_FOUND';
      }
      if (invoice.status !== 'PENDING') {
        return 'NOT_PENDING';
      }
      if (invoice.sentAt !== null) {
        return 'SENT';
      }
      const payments = await tx.recipientInvoicePayment.count({ where: { invoiceId } });
      if (payments > 0) {
        return 'HAS_PAYMENTS';
      }
      await tx.recipientInvoice.delete({ where: { id: invoiceId } });
      return 'OK';
    });
  }
}
