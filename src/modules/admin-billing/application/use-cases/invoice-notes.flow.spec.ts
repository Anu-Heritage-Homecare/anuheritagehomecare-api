import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { InvoiceNoteCategory } from '../../domain/invoice-note-category.enum';
import { InvoiceNote } from '../../domain/invoice-note.entity';
import { InvoiceNoteRepository } from '../../domain/invoice-note.repository';
import { BillingInvoiceNotesReadModel } from '../ports/billing-invoice-notes-read.port';
import { AddInvoiceNoteUseCase } from './add-invoice-note.use-case';
import { ListInvoiceNotesUseCase } from './list-invoice-notes.use-case';

const NOW = new Date('2026-10-31T10:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'note-1' };

describe('InvoiceNote entity', () => {
  it('trims the body and keeps the category', () => {
    const note = InvoiceNote.create({
      id: 'n1',
      invoiceId: 'inv1',
      authorId: 'admin1',
      category: InvoiceNoteCategory.FollowUp,
      body: '  Spoke with the family by phone.  ',
      now: NOW,
    });
    expect(note.body).toBe('Spoke with the family by phone.');
    expect(note.category).toBe(InvoiceNoteCategory.FollowUp);
  });

  it('rejects a blank body', () => {
    expect(() =>
      InvoiceNote.create({
        id: 'n1',
        invoiceId: 'inv1',
        authorId: 'admin1',
        category: InvoiceNoteCategory.General,
        body: '   ',
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });

  it('rejects a body over the limit', () => {
    expect(() =>
      InvoiceNote.create({
        id: 'n1',
        invoiceId: 'inv1',
        authorId: 'admin1',
        category: InvoiceNoteCategory.General,
        body: 'x'.repeat(2001),
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});

describe('AddInvoiceNoteUseCase', () => {
  function repo(exists: boolean): InvoiceNoteRepository & { saved: InvoiceNote[] } {
    const saved: InvoiceNote[] = [];
    return {
      saved,
      save: (note) => {
        saved.push(note);
        return Promise.resolve();
      },
      invoiceExists: () => Promise.resolve(exists),
    };
  }

  it('adds a note to an existing invoice authored by the admin', async () => {
    const r = repo(true);
    const result = await new AddInvoiceNoteUseCase(r, ids, clock).execute({
      invoiceId: 'inv1',
      authorId: 'admin1',
      category: InvoiceNoteCategory.InvoiceAudit,
      body: 'Draft invoice compiled.',
    });

    expect(result.id).toBe('note-1');
    expect(result.createdAt).toBe(NOW.toISOString());
    expect(r.saved[0].invoiceId).toBe('inv1');
    expect(r.saved[0].authorId).toBe('admin1');
    expect(r.saved[0].category).toBe(InvoiceNoteCategory.InvoiceAudit);
  });

  it('throws when the invoice is missing, without saving', async () => {
    const r = repo(false);
    await expect(
      new AddInvoiceNoteUseCase(r, ids, clock).execute({
        invoiceId: 'missing',
        authorId: 'admin1',
        category: InvoiceNoteCategory.General,
        body: 'A note.',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(r.saved).toHaveLength(0);
  });
});

describe('ListInvoiceNotesUseCase', () => {
  it('maps notes with their author and the created date as ISO', async () => {
    const reads: BillingInvoiceNotesReadModel = {
      list: () =>
        Promise.resolve([
          {
            id: 'n1',
            category: InvoiceNoteCategory.FollowUp,
            body: 'Spoke with the family.',
            createdAt: new Date('2026-07-22T11:50:00.000Z'),
            authorName: 'Sarah Jenkins',
            authorRole: 'OPERATIONS_MANAGER',
            authorPhotoKey: null,
          },
        ]),
    };
    const result = await new ListInvoiceNotesUseCase(reads).execute('inv1');

    expect(result.total).toBe(1);
    expect(result.notes[0]).toMatchObject({
      category: InvoiceNoteCategory.FollowUp,
      authorName: 'Sarah Jenkins',
      authorRole: 'OPERATIONS_MANAGER',
      createdAt: '2026-07-22T11:50:00.000Z',
    });
  });

  it('throws when the invoice is missing', async () => {
    const reads: BillingInvoiceNotesReadModel = {
      list: () => Promise.resolve(null),
    };
    await expect(new ListInvoiceNotesUseCase(reads).execute('missing')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
