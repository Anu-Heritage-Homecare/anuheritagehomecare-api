import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceNotesResult } from '../dto/billing-invoice-notes.result';
import {
  BILLING_INVOICE_NOTES_READ_MODEL,
  BillingInvoiceNotesReadModel,
} from '../ports/billing-invoice-notes-read.port';

/** The Notes tab: an invoice's internal notes, newest first, with their authors. Read only. */
@Injectable()
export class ListInvoiceNotesUseCase {
  constructor(
    @Inject(BILLING_INVOICE_NOTES_READ_MODEL)
    private readonly reads: BillingInvoiceNotesReadModel,
  ) {}

  async execute(invoiceId: string): Promise<InvoiceNotesResult> {
    const notes = await this.reads.list(invoiceId);
    if (notes === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    return {
      notes: notes.map((note) => ({
        id: note.id,
        category: note.category,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        authorName: note.authorName,
        authorRole: note.authorRole,
        authorPhotoKey: note.authorPhotoKey,
      })),
      total: notes.length,
    };
  }
}
