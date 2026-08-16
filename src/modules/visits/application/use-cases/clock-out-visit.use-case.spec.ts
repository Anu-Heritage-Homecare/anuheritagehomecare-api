import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { ClockOutVisitUseCase } from './clock-out-visit.use-case';

describe('ClockOutVisitUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: ClockOutVisitUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new ClockOutVisitUseCase(visits, fixedClock);
  });

  it('completes a visit that is under way', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result.status).toBe(VisitStatus.Completed);
    expect(result.clockOutAt).not.toBeNull();
  });

  it('refuses to clock out a visit that was never clocked into', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'v1', caregiverId: 'caregiver-2' }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
