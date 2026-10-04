import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CaregiverNotesTabView, CaregiverReadModel } from '../ports/caregiver-read.port';
import { GetCaregiverNotesUseCase } from './get-caregiver-notes.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(): CaregiverNotesTabView {
  return {
    counts: { total: 56, thisMonth: 12, internal: 8 },
    notes: [
      {
        id: 'v1',
        type: 'VISIT',
        authorName: 'Sarah Williams',
        authorRole: 'Self',
        bySelf: true,
        text: 'Morning routine with Margaret completed.',
        createdAt: new Date('2026-07-24T10:15:00.000Z'),
      },
      {
        id: 's1',
        type: 'SUPERVISOR',
        authorName: 'Mike Chen',
        authorRole: 'Care Coordinator',
        bySelf: false,
        text: 'Excellent handling of the schedule change this week.',
        createdAt: new Date('2026-07-23T16:30:00.000Z'),
      },
      {
        id: 'i1',
        type: 'INTERNAL',
        authorName: 'Mike Chen',
        authorRole: null,
        bySelf: false,
        text: 'Sarah requested advanced dementia training enrollment.',
        createdAt: new Date('2026-07-20T11:00:00.000Z'),
      },
    ],
  };
}

function reads(tab: CaregiverNotesTabView | null): CaregiverReadModel {
  return {
    list: () => Promise.resolve({ total: 0, rows: [] }),
    overview: () => Promise.resolve(null),
    scheduleTab: () => Promise.resolve(null),
    performanceTab: () => Promise.resolve(null),
    documentsTab: () => Promise.resolve(null),
    notesTab: () => Promise.resolve(tab),
  };
}

describe('GetCaregiverNotesUseCase', () => {
  it('returns the counts and the merged feed newest first', async () => {
    const result = await new GetCaregiverNotesUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
      type: null,
      search: null,
      from: null,
      to: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.counts).toEqual({ total: 56, thisMonth: 12, internal: 8 });
    expect(result.notes.total).toBe(3);
    expect(result.notes.rows[0].id).toBe('v1'); // newest
    expect(result.notes.rows[0].typeLabel).toBe('Visit Note');
    expect(result.notes.rows[0].bySelf).toBe(true);
  });

  it('filters by note type', async () => {
    const result = await new GetCaregiverNotesUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
      type: 'SUPERVISOR',
      search: null,
      from: null,
      to: null,
      page: 1,
      pageSize: 10,
    });
    expect(result.notes.total).toBe(1);
    expect(result.notes.rows[0].id).toBe('s1');
  });

  it('searches the note text', async () => {
    const result = await new GetCaregiverNotesUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
      type: null,
      search: 'dementia',
      from: null,
      to: null,
      page: 1,
      pageSize: 10,
    });
    expect(result.notes.total).toBe(1);
    expect(result.notes.rows[0].id).toBe('i1');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new GetCaregiverNotesUseCase(reads(null), clock).execute({
        profileId: 'nope',
        type: null,
        search: null,
        from: null,
        to: null,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
