import { ValidationException } from '@shared/domain/domain-exception';
import { CareNote } from './care-note.entity';
import { NoteCategory } from './note-category.enum';

const NOW = new Date('2026-07-24T10:15:00.000Z');

function post(overrides: Partial<Parameters<typeof CareNote.post>[0]> = {}): CareNote {
  return CareNote.post({
    id: 'n1',
    careRecipientId: 'r1',
    category: NoteCategory.VisitNote,
    content: 'Morning routine completed successfully.',
    authorName: 'Sarah Williams',
    authorRole: 'CNA',
    now: NOW,
    ...overrides,
  });
}

describe('CareNote', () => {
  it('posts a note, defaulting postedAt to now and starting unacknowledged', () => {
    const note = post();
    expect(note.postedAt).toEqual(NOW);
    expect(note.acknowledgedAt).toBeNull();
    expect(note.flaggedForReview).toBe(false);
    expect(note.attachmentKeys).toEqual([]);
  });

  it('trims content and rejects an empty note', () => {
    expect(post({ content: '  logged  ' }).content).toBe('logged');
    expect(() => post({ content: '   ' })).toThrow(ValidationException);
  });

  it('rejects an empty author', () => {
    expect(() => post({ authorName: '  ' })).toThrow(ValidationException);
  });

  it('honours an explicit postedAt and a flagged incident', () => {
    const posted = new Date('2026-07-22T15:00:00.000Z');
    const note = post({
      category: NoteCategory.Incident,
      flaggedForReview: true,
      postedAt: posted,
    });
    expect(note.postedAt).toEqual(posted);
    expect(note.flaggedForReview).toBe(true);
    expect(note.category).toBe(NoteCategory.Incident);
  });

  it('rejects too many attachments', () => {
    const keys = Array.from({ length: 21 }, (_, i) => `key-${i}`);
    expect(() => post({ attachmentKeys: keys })).toThrow(ValidationException);
  });

  it('acknowledges once and ignores a repeat acknowledgement', () => {
    const note = post();
    const later = new Date('2026-07-24T12:00:00.000Z');
    note.acknowledge('admin1', later);
    expect(note.acknowledgedAt).toEqual(later);
    expect(note.acknowledgedByAdminId).toBe('admin1');

    note.acknowledge('admin2', new Date('2026-07-24T13:00:00.000Z'));
    expect(note.acknowledgedAt).toEqual(later);
    expect(note.acknowledgedByAdminId).toBe('admin1');
  });

  it('flags and clears the review flag', () => {
    const note = post();
    note.setFlagged(true, NOW);
    expect(note.flaggedForReview).toBe(true);
    note.setFlagged(false, NOW);
    expect(note.flaggedForReview).toBe(false);
  });
});
