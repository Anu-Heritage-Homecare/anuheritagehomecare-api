import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  InvoiceWriteOffRepository,
  WriteOffInvoiceOutcome,
} from '../../domain/invoice-writeoff.repository';

/** Prisma adapter that writes off an outstanding (PENDING) invoice with an atomic guard. */
@Injectable()
export class InvoiceWriteOffPrismaRepository implements InvoiceWriteOffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async writeOffIfOutstanding(invoiceId: string): Promise<WriteOffInvoiceOutcome> {
    // Atomic guard: only a PENDING invoice flips to WRITTEN_OFF. count is 1 on success.
    const updated = await this.prisma.recipientInvoice.updateMany({
      where: { id: invoiceId, status: 'PENDING' },
      data: { status: 'WRITTEN_OFF' },
    });
    if (updated.count === 1) {
      return 'OK';
    }
    const exists = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    return exists === null ? 'NOT_FOUND' : 'NOT_OUTSTANDING';
  }
}
