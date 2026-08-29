import { ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { RecordObservationsUseCase } from './record-observations.use-case';

describe('RecordObservationsUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: RecordObservationsUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new RecordObservationsUseCase(visits, fixedClock);
  });

  it('records the observations during the visit', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      mood: 'Good',
      appetite: 'Ate well',
      mobility: 'Walked with walker',
      medicationStatus: 'All taken',
    });

    expect(result).toEqual({
      mood: 'Good',
      appetite: 'Ate well',
      mobility: 'Walked with walker',
      medicationStatus: 'All taken',
    });
    expect((await visits.findById('v1'))?.observation.mood).toBe('Good');
  });

  it('refuses to record before the visit is in progress', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1', mood: 'Good' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
