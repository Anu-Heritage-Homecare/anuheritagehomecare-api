import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareNote } from '@modules/care-notes/domain/care-note.entity';
import { CareNoteRepository } from '@modules/care-notes/domain/care-note.repository';
import { NoteCategory } from '@modules/care-notes/domain/note-category.enum';
import { NoteComment } from '@modules/care-notes/domain/note-comment.entity';
import { NoteCommentRepository } from '@modules/care-notes/domain/note-comment.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AcknowledgeCareNoteUseCase } from './acknowledge-care-note.use-case';
import { AddCareNoteUseCase } from './add-care-note.use-case';
import { AddNoteCommentUseCase } from './add-note-comment.use-case';
import { FlagCareNoteUseCase } from './flag-care-note.use-case';

const NOW = new Date('2026-07-24T10:15:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

class NoteStore implements CareNoteRepository {
  public items: CareNote[] = [];
  add(note: CareNote): Promise<void> {
    this.items.push(note);
    return Promise.resolve();
  }
  save(note: CareNote): Promise<void> {
    const index = this.items.findIndex((n) => n.id === note.id);
    if (index !== -1) {
      this.items[index] = note;
    }
    return Promise.resolve();
  }
  findById(id: string): Promise<CareNote | null> {
    return Promise.resolve(this.items.find((n) => n.id === id) ?? null);
  }
}

class CommentStore implements NoteCommentRepository {
  public items: NoteComment[] = [];
  add(comment: NoteComment): Promise<void> {
    this.items.push(comment);
    return Promise.resolve();
  }
}

function seededNote(id: string): CareNote {
  return CareNote.post({
    id,
    careRecipientId: R,
    category: NoteCategory.Incident,
    content: 'Client attempted to stand without assistance.',
    authorName: 'Sarah Williams',
    authorRole: 'CNA',
    flaggedForReview: true,
    now: NOW,
  });
}

describe('care notes admin writes', () => {
  it('logs a note attributed to the admin who entered it', async () => {
    const notes = new NoteStore();
    const useCase = new AddCareNoteUseCase(recipients(true), notes, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      adminId: 'admin1',
      category: NoteCategory.Coordinator,
      content: 'Spoke with David Johnson regarding next week schedule.',
      authorName: 'Mike Chen',
      authorRole: 'Care Coordinator',
    });

    expect(notes.items).toHaveLength(1);
    expect(notes.items[0].id).toBe(id);
    expect(notes.items[0].authorAdminId).toBe('admin1');
    expect(notes.items[0].category).toBe(NoteCategory.Coordinator);
  });

  it('rejects logging a note for an unknown recipient', async () => {
    const useCase = new AddCareNoteUseCase(recipients(false), new NoteStore(), clock, ids());
    await expect(
      useCase.execute({
        recipientId: 'nope',
        adminId: 'admin1',
        category: NoteCategory.Clinical,
        content: 'x',
        authorName: 'Nurse',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('acknowledges a note', async () => {
    const notes = new NoteStore();
    notes.items.push(seededNote('note1'));
    const useCase = new AcknowledgeCareNoteUseCase(notes, clock);

    const result = await useCase.execute({ recipientId: R, noteId: 'note1', adminId: 'admin1' });

    expect(result.acknowledged).toBe(true);
    expect(notes.items[0].acknowledgedByAdminId).toBe('admin1');
  });

  it('rejects acknowledging a note of another recipient', async () => {
    const notes = new NoteStore();
    notes.items.push(seededNote('note1'));
    const useCase = new AcknowledgeCareNoteUseCase(notes, clock);
    await expect(
      useCase.execute({ recipientId: 'other', noteId: 'note1', adminId: 'admin1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('clears the review flag on a note', async () => {
    const notes = new NoteStore();
    notes.items.push(seededNote('note1'));
    const useCase = new FlagCareNoteUseCase(notes, clock);

    const result = await useCase.execute({ recipientId: R, noteId: 'note1', flagged: false });

    expect(result.flaggedForReview).toBe(false);
    expect(notes.items[0].flaggedForReview).toBe(false);
  });

  it('appends a comment to a note in scope', async () => {
    const notes = new NoteStore();
    notes.items.push(seededNote('note1'));
    const comments = new CommentStore();
    const useCase = new AddNoteCommentUseCase(notes, comments, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      noteId: 'note1',
      authorName: 'Dr. Jane Foster',
      authorRole: 'Care Coordinator',
      content: 'Following up with the family this afternoon.',
    });

    expect(comments.items).toHaveLength(1);
    expect(comments.items[0].id).toBe(id);
    expect(comments.items[0].noteId).toBe('note1');
  });

  it('rejects commenting on a note of another recipient', async () => {
    const notes = new NoteStore();
    notes.items.push(seededNote('note1'));
    const useCase = new AddNoteCommentUseCase(notes, new CommentStore(), clock, ids());
    await expect(
      useCase.execute({
        recipientId: 'other',
        noteId: 'note1',
        authorName: 'X',
        content: 'hi',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
