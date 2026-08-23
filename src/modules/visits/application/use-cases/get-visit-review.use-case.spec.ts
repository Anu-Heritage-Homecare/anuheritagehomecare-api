import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { VisitStatus } from '../../domain/visit-status.enum';
import { MedicationAdministration } from '../../domain/value-objects/medication-administration.vo';
import { VitalsReading } from '../../domain/value-objects/vitals-reading.vo';
import { FIXED_NOW, InMemoryVisitRepository, buildVisit } from '../../test-support/doubles';
import { GetVisitReviewUseCase } from './get-visit-review.use-case';

describe('GetVisitReviewUseCase', () => {
  let visits: InMemoryVisitRepository;
  let useCase: GetVisitReviewUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    useCase = new GetVisitReviewUseCase(visits);
  });

  it('reports which parts of the record are filled in', async () => {
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        tasks: [
          { label: 'Morning medication', completed: true },
          { label: 'Light housekeeping', completed: true },
        ],
        medicationAdministrations: [
          MedicationAdministration.create({
            medicationId: 'med-1',
            outcome: MedicationAdministrationOutcome.Administered,
            recordedAt: FIXED_NOW,
          }),
        ],
        vitals: [],
        visitNote: 'Client in good spirits.',
        familyNote: null,
        photoKeys: ['photo-1'],
      }),
    );

    const result = await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result).toEqual({
      id: 'v1',
      status: VisitStatus.InProgress,
      tasksTotal: 2,
      tasksCompleted: 2,
      allTasksCompleted: true,
      medicationGiven: true,
      vitalsRecorded: false,
      notesAdded: true,
      familyNoteAdded: false,
      photosUploaded: true,
    });
  });

  it('reports partial task completion and no vitals given', async () => {
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        tasks: [
          { label: 'Morning medication', completed: true },
          { label: 'Light housekeeping', completed: false },
        ],
        vitals: [VitalsReading.create({ heartRate: 72, recordedAt: FIXED_NOW })],
      }),
    );

    const result = await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result.tasksCompleted).toBe(1);
    expect(result.allTasksCompleted).toBe(false);
    expect(result.vitalsRecorded).toBe(true);
    expect(result.medicationGiven).toBe(false);
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'v1', caregiverId: 'caregiver-2' }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
