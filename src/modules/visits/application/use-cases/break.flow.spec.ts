import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { EndBreakUseCase } from './end-break.use-case';
import { StartBreakUseCase } from './start-break.use-case';

describe('Visit break flow', () => {
  let visits: InMemoryVisitRepository;
  let startBreak: StartBreakUseCase;
  let endBreak: EndBreakUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    startBreak = new StartBreakUseCase(visits, fixedClock);
    endBreak = new EndBreakUseCase(visits, fixedClock);
  });

  it('starts a break on an in progress visit', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await startBreak.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result.status).toBe(VisitStatus.OnBreak);
    expect(result.onBreakSince).not.toBeNull();
    expect((await visits.findById('v1'))?.status).toBe(VisitStatus.OnBreak);
  });

  it('ends the break and returns the visit to in progress', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));
    await startBreak.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    const result = await endBreak.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result.status).toBe(VisitStatus.InProgress);
    expect(result.onBreakSince).toBeNull();
  });

  it('refuses to start a break on a visit that is not in progress', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      startBreak.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('refuses to end a break when none is open', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    await expect(
      endBreak.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(
      buildVisit({ id: 'v1', caregiverId: 'caregiver-2', status: VisitStatus.InProgress }),
    );

    await expect(
      startBreak.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
