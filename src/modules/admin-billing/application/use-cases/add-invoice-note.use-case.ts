import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceNoteCategory } from '../../domain/invoice-note-category.enum';
import { InvoiceNote } from '../../domain/invoice-note.entity';
import {
  INVOICE_NOTE_REPOSITORY,
  InvoiceNoteRepository,
} from '../../domain/invoice-note.repository';
import { InvoiceNoteCreatedResult } from '../dto/billing-invoice-notes.result';

export interface AddInvoiceNoteCommand {
  invoiceId: string;
  authorId: string;
  category: InvoiceNoteCategory;
  body: string;
}

/** Add an internal note to an invoice (the Add Note action). */
@Injectable()
export class AddInvoiceNoteUseCase {
  constructor(
    @Inject(INVOICE_NOTE_REPOSITORY) private readonly notes: InvoiceNoteRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddInvoiceNoteCommand): Promise<InvoiceNoteCreatedResult> {
    if (!(await this.notes.invoiceExists(command.invoiceId))) {
      throw new NotFoundDomainException('Invoice not found');
    }
    const note = InvoiceNote.create({
      id: this.ids.generate(),
      invoiceId: command.invoiceId,
      authorId: command.authorId,
      category: command.category,
      body: command.body,
      now: this.clock.now(),
    });
    await this.notes.save(note);
    return { id: note.id, createdAt: note.createdAt.toISOString() };
  }
}
