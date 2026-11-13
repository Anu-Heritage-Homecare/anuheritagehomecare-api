import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceNumberPreviewPort } from '../../application/ports/invoice-number-preview.port';

/**
 * Previews the next invoice sequence as the highest issued sequence plus one. A
 * read only estimate for the Next Number display; the authoritative sequence is
 * assigned when an invoice is actually created.
 */
@Injectable()
export class InvoiceNumberPreviewPrisma implements InvoiceNumberPreviewPort {
  constructor(private readonly prisma: PrismaService) {}

  async nextSequence(): Promise<number> {
    const last = await this.prisma.recipientInvoice.findFirst({
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return (last?.sequence ?? 0) + 1;
  }
}
