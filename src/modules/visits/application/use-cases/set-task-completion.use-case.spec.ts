import { ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { SetTaskCompletionUseCase } from './set-task-completion.use-case';

describe('SetTaskCompletionUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: SetTaskCompletionUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new SetTaskCompletionUseCase(visits, fixedClock);
  });

  it('ticks a task complete by its position', async () => {
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        tasks: [
          { label: 'Assist with morning', completed: false },
          { label: 'Bathing', completed: false },
        ],
      }),
    );

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      taskIndex: 1,
      completed: true,
    });

    expect(result.tasks).toEqual([
      { label: 'Assist with morning', completed: false, durationMinutes: null },
      { label: 'Bathing', completed: true, durationMinutes: null },
    ]);
  });

  it('records how long a task took when completing it', async () => {
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        tasks: [{ label: 'Walk', completed: false }],
      }),
    );

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      taskIndex: 0,
      completed: true,
      durationMinutes: 15,
    });

    expect(result.tasks).toEqual([{ label: 'Walk', completed: true, durationMinutes: 15 }]);
  });

  it('drops a recorded duration when a task is cleared', async () => {
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        tasks: [{ label: 'Walk', completed: true, completedAt: new Date(), durationMinutes: 15 }],
      }),
    );

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      taskIndex: 0,
      completed: false,
    });

    expect(result.tasks).toEqual([{ label: 'Walk', completed: false, durationMinutes: null }]);
  });

  it('rejects a task position that does not exist', async () => {
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        tasks: [{ label: 'Assist with morning', completed: false }],
      }),
    );

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1', taskIndex: 9, completed: true }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
