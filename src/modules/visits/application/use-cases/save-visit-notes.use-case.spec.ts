import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { SaveVisitNotesUseCase } from './save-visit-notes.use-case';

describe('SaveVisitNotesUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: SaveVisitNotesUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new SaveVisitNotesUseCase(visits, fixedClock);
  });

  it('saves the notes and photo keys, dropping blanks', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      visitNote: '  All well  ',
      familyNote: '   ',
      photoKeys: ['key-1', '  ', 'key-2'],
    });

    expect(result.visitNote).toBe('All well');
    expect(result.familyNote).toBeNull();
    expect(result.photoKeys).toEqual(['key-1', 'key-2']);
  });
});
