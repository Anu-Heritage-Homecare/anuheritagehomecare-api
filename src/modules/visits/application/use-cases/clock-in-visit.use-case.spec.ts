import {
  NotFoundDomainException,
  OutsideGeofenceException,
  ValidationException,
} from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import {
  FakeCareRecipientDirectory,
  InMemoryVisitRepository,
  buildSnapshot,
  buildVisit,
  fakeGeofenceConfig,
  fixedClock,
} from '../../test-support/doubles';
import { ClockInVisitUseCase } from './clock-in-visit.use-case';

describe('ClockInVisitUseCase', () => {
  let visits: InMemoryVisitRepository;
  let recipients: FakeCareRecipientDirectory;
  let useCase: ClockInVisitUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    recipients = new FakeCareRecipientDirectory();
    // Recipient pinned at 37.3861, -122.0839.
    recipients.add(buildSnapshot());
    useCase = new ClockInVisitUseCase(visits, recipients, fakeGeofenceConfig(150), fixedClock);
  });

  it('clocks in and starts the visit when inside the geofence', async () => {
    await visits.save(buildVisit({ id: 'v1' }));

    // About 111 metres north, inside the 150 metre radius.
    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      latitude: 37.3871,
      longitude: -122.0839,
    });

    expect(result.status).toBe(VisitStatus.InProgress);
    expect(result.clockInAt).not.toBeNull();
    expect((await visits.findById('v1'))?.status).toBe(VisitStatus.InProgress);
  });

  it('refuses to clock in from outside the geofence', async () => {
    await visits.save(buildVisit({ id: 'v1' }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        latitude: 37.4,
        longitude: -122.09,
      }),
    ).rejects.toBeInstanceOf(OutsideGeofenceException);
    expect((await visits.findById('v1'))?.status).toBe(VisitStatus.Scheduled);
  });

  it('rejects clock in when the recipient has no pinned location', async () => {
    recipients.add(buildSnapshot({ id: 'no-geo', latitude: null, longitude: null }));
    await visits.save(buildVisit({ id: 'v1', careRecipientId: 'no-geo' }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        latitude: 37.3861,
        longitude: -122.0839,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'v1', caregiverId: 'caregiver-2' }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        latitude: 37.3861,
        longitude: -122.0839,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('refuses to clock in twice', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        latitude: 37.3861,
        longitude: -122.0839,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
