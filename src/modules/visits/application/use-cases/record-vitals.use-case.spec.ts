import { ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { RecordVitalsUseCase } from './record-vitals.use-case';

describe('RecordVitalsUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: RecordVitalsUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new RecordVitalsUseCase(visits, fixedClock);
  });

  it('records a vitals reading during the visit', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      oxygenSaturation: 98,
      weightGrams: 98000,
    });

    expect(result.heartRate).toBe(72);
    expect(result.recordedAt).not.toBeNull();
    expect((await visits.findById('v1'))?.vitals).toHaveLength(1);
  });

  it('rejects a reading with no measures', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('refuses to record before the visit is in progress', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1', heartRate: 72 }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
