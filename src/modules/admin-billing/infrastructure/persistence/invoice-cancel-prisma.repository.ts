import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CancelInvoiceOutcome,
  InvoiceCancelRepository,
} from '../../domain/invoice-cancel.repository';

/** Prisma adapter that voids a PENDING invoice with an atomic status guard. */
@Injectable()
export class InvoiceCancelPrismaRepository implements InvoiceCancelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async cancelIfPending(invoiceId: string): Promise<CancelInvoiceOutcome> {
    // Atomic guard: only a PENDING invoice flips to CANCELLED. count is 1 on success.
    const updated = await this.prisma.recipientInvoice.updateMany({
      where: { id: invoiceId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (updated.count === 1) {
      return 'OK';
    }
    const exists = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    return exists === null ? 'NOT_FOUND' : 'NOT_PENDING';
  }
}
