import { ValidationException } from '@shared/domain/domain-exception';
import { NoteAudience } from '../../domain/note-audience.enum';
import { VisitStatus } from '../../domain/visit-status.enum';
import {
  InMemoryVisitRepository,
  buildVisit,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { AddVisitNoteUseCase } from './add-visit-note.use-case';

describe('AddVisitNoteUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: AddVisitNoteUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new AddVisitNoteUseCase(visits, sequentialIds('note'), fixedClock);
  });

  it('appends a note to the feed authored by the caregiver', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      audience: NoteAudience.Family,
      text: '  Mary enjoyed her walk.  ',
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject({
      authorId: 'caregiver-1',
      audience: 'FAMILY',
      text: 'Mary enjoyed her walk.',
    });
  });

  it('keeps notes in the order they were added', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      audience: NoteAudience.CareTeam,
      text: 'First note.',
    });
    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      audience: NoteAudience.Family,
      text: 'Second note.',
    });

    expect(result.notes.map((note) => note.text)).toEqual(['First note.', 'Second note.']);
  });

  it('rejects an empty note', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        audience: NoteAudience.Family,
        text: '   ',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a note on a visit that is not in progress', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        audience: NoteAudience.Family,
        text: 'Too early.',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
