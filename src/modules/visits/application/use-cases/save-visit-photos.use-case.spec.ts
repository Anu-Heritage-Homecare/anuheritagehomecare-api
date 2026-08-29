import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { SaveVisitPhotosUseCase } from './save-visit-photos.use-case';

describe('SaveVisitPhotosUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: SaveVisitPhotosUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new SaveVisitPhotosUseCase(visits, fixedClock);
  });

  it('replaces the photo keys, trimming blanks', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      photoKeys: ['visits/v1/a.jpg', '  ', 'visits/v1/b.jpg'],
    });

    expect(result.photoKeys).toEqual(['visits/v1/a.jpg', 'visits/v1/b.jpg']);
  });
});
