import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceNote } from '../../domain/invoice-note.entity';
import { InvoiceNoteRepository } from '../../domain/invoice-note.repository';

/** Prisma backed adapter for the InvoiceNoteRepository port. */
@Injectable()
export class InvoiceNotePrismaRepository implements InvoiceNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(note: InvoiceNote): Promise<void> {
    await this.prisma.invoiceNote.create({
      data: {
        id: note.id,
        invoiceId: note.invoiceId,
        authorId: note.authorId,
        // Domain and Prisma enums share the same string values.
        category: note.category,
        body: note.body,
        createdAt: note.createdAt,
      },
    });
  }

  async invoiceExists(invoiceId: string): Promise<boolean> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    return invoice !== null;
  }
}
