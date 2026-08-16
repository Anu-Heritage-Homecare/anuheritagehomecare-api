import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import {
  FakeCareRecipientDirectory,
  FakeOwnerContactDirectory,
  InMemoryVisitRepository,
  buildSnapshot,
  buildVisit,
  fixedClock,
} from '../../test-support/doubles';
import { GetVisitDetailUseCase } from './get-visit-detail.use-case';

describe('GetVisitDetailUseCase', () => {
  let visits: InMemoryVisitRepository;
  let recipients: FakeCareRecipientDirectory;
  let owners: FakeOwnerContactDirectory;
  let useCase: GetVisitDetailUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    recipients = new FakeCareRecipientDirectory();
    owners = new FakeOwnerContactDirectory();
    recipients.add(buildSnapshot());
    owners.set('owner-1', { name: 'Sarah Adams John', phone: '+14155550100' });
    useCase = new GetVisitDetailUseCase(visits, recipients, owners, fixedClock);
  });

  it('returns the full detail joining visit, recipient, health note and contact', async () => {
    await visits.save(
      buildVisit({
        id: 'visit-9',
        status: VisitStatus.Completed,
        startMinute: 9 * 60,
        endMinute: 14 * 60,
        tasks: [
          { label: 'Blood Pressure', completed: true },
          { label: 'Meal Preparation', completed: true },
        ],
        specialInstructions: ['Gate Code: 2456', 'Patient has a small dog'],
      }),
    );

    const detail = await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'visit-9' });

    expect(detail).toMatchObject({
      id: 'visit-9',
      status: VisitStatus.Completed,
      startMinute: 540,
      endMinute: 840,
      address: '123 Maple Street, Sunnyvale, CA 94086',
    });
    expect(detail.recipient).toMatchObject({ name: 'Eleanor Ross', age: 82 });
    expect(detail.tasks).toEqual([
      { label: 'Blood Pressure', completed: true },
      { label: 'Meal Preparation', completed: true },
    ]);
    expect(detail.specialInstructions).toEqual(['Gate Code: 2456', 'Patient has a small dog']);
    expect(detail.healthNote).toEqual({
      medicalConditions: ['Diabetes', 'High Fall Risk'],
      allergies: ['Penicillin Allergy'],
    });
    expect(detail.emergencyContact).toEqual({ name: 'Sarah Adams John', phone: '+14155550100' });
  });

  it('returns a null emergency contact when the owner has no account on file', async () => {
    recipients.add(buildSnapshot({ id: 'recipient-2', ownerId: 'owner-unknown' }));
    await visits.save(buildVisit({ id: 'visit-2', careRecipientId: 'recipient-2' }));

    const detail = await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'visit-2' });

    expect(detail.emergencyContact).toBeNull();
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'visit-3', caregiverId: 'caregiver-2' }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'visit-3' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('reports an unknown visit as not found', async () => {
    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'ghost' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
