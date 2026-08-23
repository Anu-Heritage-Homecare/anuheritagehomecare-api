import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { VisitStatus } from '../../domain/visit-status.enum';
import {
  FakeCareRecipientDirectory,
  InMemoryVisitRepository,
  buildSnapshot,
  buildVisit,
  fixedClock,
} from '../../test-support/doubles';
import { RecordMedicationAdministrationUseCase } from './record-medication-administration.use-case';

describe('RecordMedicationAdministrationUseCase', () => {
  let visits: InMemoryVisitRepository;
  let recipients: FakeCareRecipientDirectory;
  let useCase: RecordMedicationAdministrationUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    recipients = new FakeCareRecipientDirectory();
    recipients.add(buildSnapshot());
    useCase = new RecordMedicationAdministrationUseCase(visits, recipients, fixedClock);
  });

  it('records an outcome for a medication on the recipient schedule', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      medicationId: 'med-1',
      outcome: MedicationAdministrationOutcome.Refused,
      note: 'Patient refused',
    });

    expect(result.outcome).toBe(MedicationAdministrationOutcome.Refused);
    expect(result.note).toBe('Patient refused');
    expect((await visits.findById('v1'))?.medicationAdministrations).toHaveLength(1);
  });

  it('rejects a medication that is not on the recipient schedule', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        medicationId: 'not-a-med',
        outcome: MedicationAdministrationOutcome.Administered,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('refuses to record before the visit is in progress', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        medicationId: 'med-1',
        outcome: MedicationAdministrationOutcome.Administered,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(
      buildVisit({ id: 'v1', caregiverId: 'caregiver-2', status: VisitStatus.InProgress }),
    );

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        medicationId: 'med-1',
        outcome: MedicationAdministrationOutcome.Administered,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
