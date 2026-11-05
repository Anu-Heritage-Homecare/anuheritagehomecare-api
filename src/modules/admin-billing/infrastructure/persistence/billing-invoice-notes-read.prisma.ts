import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceNoteCategory } from '../../domain/invoice-note-category.enum';
import {
  BillingInvoiceNotesReadModel,
  InvoiceNoteView,
} from '../../application/ports/billing-invoice-notes-read.port';

/** Prisma read model for the invoice Notes tab: each note joined to its admin author. */
@Injectable()
export class BillingInvoiceNotesReadPrisma implements BillingInvoiceNotesReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(invoiceId: string): Promise<InvoiceNoteView[] | null> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    if (invoice === null) {
      return null;
    }

    const notes = await this.prisma.invoiceNote.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        body: true,
        createdAt: true,
        author: { select: { firstName: true, lastName: true, role: true, photoKey: true } },
      },
    });

    return notes.map((note) => ({
      id: note.id,
      category: note.category as unknown as InvoiceNoteCategory,
      body: note.body,
      createdAt: note.createdAt,
      authorName: `${note.author.firstName} ${note.author.lastName}`.trim(),
      authorRole: note.author.role,
      authorPhotoKey: note.author.photoKey,
    }));
  }
}
