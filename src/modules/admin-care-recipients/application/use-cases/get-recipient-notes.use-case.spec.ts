import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { NoteCategory } from '@modules/care-notes/domain/note-category.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  NoteCountsView,
  NoteFilter,
  NotePageView,
  RecipientNotesReadModel,
} from '../ports/recipient-notes-read.port';
import { GetRecipientNotesUseCase } from './get-recipient-notes.use-case';

const NOW = new Date('2026-07-24T10:15:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

class FakeReadModel implements RecipientNotesReadModel {
  public lastFilter: NoteFilter | null = null;

  listPage(filter: NoteFilter): Promise<NotePageView> {
    this.lastFilter = filter;
    return Promise.resolve({
      total: 1,
      rows: [
        {
          id: 'note1',
          category: NoteCategory.VisitNote,
          content: 'Morning routine completed.',
          authorName: 'Sarah Williams',
          authorRole: 'CNA',
          postedAt: NOW,
          flaggedForReview: false,
          acknowledgedAt: null,
          commentCount: 2,
          attachmentCount: 1,
        },
      ],
    });
  }

  counts(): Promise<NoteCountsView> {
    return Promise.resolve({
      total: 89,
      byCategory: new Map([
        [NoteCategory.VisitNote, 52],
        [NoteCategory.Incident, 2],
      ]),
      thisMonth: 24,
      flaggedForReview: 2,
    });
  }

  authors(): Promise<string[]> {
    return Promise.resolve(['Mike Chen', 'Sarah Williams']);
  }
}

describe('GetRecipientNotesUseCase', () => {
  it('assembles the snapshot, category counts, authors and mapped feed', async () => {
    const useCase = new GetRecipientNotesUseCase(recipients(true), new FakeReadModel(), clock);

    const result = await useCase.execute({
      recipientId: R,
      category: null,
      search: null,
      authorName: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.summary).toEqual({ totalNotes: 89, thisMonth: 24, flaggedForReview: 2 });
    expect(result.all).toBe(89);
    expect(result.categories).toContainEqual({ category: 'VISIT_NOTE', count: 52 });
    expect(result.categories).toContainEqual({ category: 'CLINICAL', count: 0 });
    expect(result.authors).toEqual(['Mike Chen', 'Sarah Williams']);
    expect(result.page.total).toBe(1);
    expect(result.page.totalPages).toBe(1);
    expect(result.page.items[0]).toMatchObject({
      id: 'note1',
      category: 'VISIT_NOTE',
      acknowledged: false,
      commentCount: 2,
      attachmentCount: 1,
    });
  });

  it('passes the category, author and search filters through to the read model', async () => {
    const readModel = new FakeReadModel();
    const useCase = new GetRecipientNotesUseCase(recipients(true), readModel, clock);

    await useCase.execute({
      recipientId: R,
      category: NoteCategory.Incident,
      search: 'fall',
      authorName: 'Sarah Williams',
      page: 2,
      pageSize: 5,
    });

    expect(readModel.lastFilter).toEqual({
      recipientId: R,
      category: NoteCategory.Incident,
      search: 'fall',
      authorName: 'Sarah Williams',
      page: 2,
      pageSize: 5,
    });
  });

  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientNotesUseCase(recipients(false), new FakeReadModel(), clock);
    await expect(
      useCase.execute({
        recipientId: 'nope',
        category: null,
        search: null,
        authorName: null,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
