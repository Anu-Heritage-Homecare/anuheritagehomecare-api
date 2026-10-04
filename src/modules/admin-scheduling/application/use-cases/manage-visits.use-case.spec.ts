import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import {
  buildVisit,
  InMemoryVisitRepository,
  sequentialIds,
} from '@modules/visits/test-support/doubles';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { VisitPriority } from '@modules/visits/domain/visit-priority.enum';
import {
  AssignVisitCaregiverUseCase,
  CancelVisitUseCase,
  EditVisitUseCase,
  RescheduleVisitUseCase,
  ScheduleVisitUseCase,
} from './manage-visits.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock = { now: () => NOW };

function recipientRepo(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(exists ? ({} as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function userRepo(userType: UserType | null): UserRepository {
  const user = userType === null ? null : ({ userType } as User);
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(user),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

describe('ScheduleVisitUseCase', () => {
  it('creates an unassigned scheduled visit', async () => {
    const visits = new InMemoryVisitRepository();
    const result = await new ScheduleVisitUseCase(
      visits,
      recipientRepo(true),
      userRepo(UserType.Caregiver),
      sequentialIds('visit'),
      clock,
    ).execute({
      careRecipientId: 'recipient-1',
      caregiverId: null,
      scheduledDate: new Date(Date.UTC(2026, 6, 25)),
      startMinute: 540,
      endMinute: 600,
      visitType: VisitType.Medication,
      priority: undefined,
      tasks: ['Give medication'],
      specialInstructions: ['Gate code 1234'],
    });
    const created = visits.store.get(result.id);
    expect(created?.isAssigned).toBe(false);
    expect(created?.status).toBe(VisitStatus.Scheduled);
    expect(created?.tasks[0].label).toBe('Give medication');
  });

  it('rejects a visit for an unknown recipient', async () => {
    await expect(
      new ScheduleVisitUseCase(
        new InMemoryVisitRepository(),
        recipientRepo(false),
        userRepo(UserType.Caregiver),
        sequentialIds('visit'),
        clock,
      ).execute({
        careRecipientId: 'nope',
        caregiverId: null,
        scheduledDate: NOW,
        startMinute: 540,
        endMinute: 600,
        visitType: VisitType.Medication,
        priority: undefined,
        tasks: [],
        specialInstructions: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects assigning a non caregiver on creation', async () => {
    await expect(
      new ScheduleVisitUseCase(
        new InMemoryVisitRepository(),
        recipientRepo(true),
        userRepo(UserType.FamilyMember),
        sequentialIds('visit'),
        clock,
      ).execute({
        careRecipientId: 'recipient-1',
        caregiverId: 'user-1',
        scheduledDate: NOW,
        startMinute: 540,
        endMinute: 600,
        visitType: VisitType.Medication,
        priority: undefined,
        tasks: [],
        specialInstructions: [],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});

describe('visit lifecycle operations', () => {
  it('assigns a caregiver to a scheduled visit', async () => {
    const visits = new InMemoryVisitRepository();
    const visit = buildVisit({ id: 'v1', status: VisitStatus.Scheduled });
    await visits.save(visit);
    await new AssignVisitCaregiverUseCase(visits, userRepo(UserType.Caregiver), clock).execute({
      visitId: 'v1',
      caregiverId: 'caregiver-9',
    });
    expect(visits.store.get('v1')?.caregiverId).toBe('caregiver-9');
  });

  it('reschedules a scheduled visit', async () => {
    const visits = new InMemoryVisitRepository();
    await visits.save(buildVisit({ id: 'v2', status: VisitStatus.Scheduled }));
    await new RescheduleVisitUseCase(visits, clock).execute({
      visitId: 'v2',
      scheduledDate: new Date(Date.UTC(2026, 6, 30)),
      startMinute: 600,
      endMinute: 660,
    });
    const visit = visits.store.get('v2');
    expect(visit?.window.startMinute).toBe(600);
    expect(visit?.scheduledDate).toEqual(new Date(Date.UTC(2026, 6, 30)));
  });

  it('cancels a scheduled visit', async () => {
    const visits = new InMemoryVisitRepository();
    await visits.save(buildVisit({ id: 'v3', status: VisitStatus.Scheduled }));
    await new CancelVisitUseCase(visits, clock).execute({ visitId: 'v3' });
    expect(visits.store.get('v3')?.status).toBe(VisitStatus.Cancelled);
  });

  it('edits a scheduled visit details and time', async () => {
    const visits = new InMemoryVisitRepository();
    await visits.save(
      buildVisit({ id: 'v4', status: VisitStatus.Scheduled, startMinute: 540, endMinute: 600 }),
    );
    await new EditVisitUseCase(visits, clock).execute({
      visitId: 'v4',
      scheduledDate: null,
      startMinute: 600,
      endMinute: 720,
      visitType: undefined,
      priority: VisitPriority.Critical,
      tasks: ['New task'],
      specialInstructions: ['Use side door'],
    });
    const visit = visits.store.get('v4');
    expect(visit?.priority).toBe(VisitPriority.Critical);
    expect(visit?.window.endMinute).toBe(720);
    expect(visit?.tasks[0].label).toBe('New task');
    expect(visit?.specialInstructions).toEqual(['Use side door']);
  });

  it('refuses to edit a visit already under way', async () => {
    const visits = new InMemoryVisitRepository();
    await visits.save(buildVisit({ id: 'v5', status: VisitStatus.InProgress }));
    await expect(
      new EditVisitUseCase(visits, clock).execute({
        visitId: 'v5',
        scheduledDate: null,
        startMinute: null,
        endMinute: null,
        visitType: undefined,
        priority: VisitPriority.High,
        tasks: undefined,
        specialInstructions: undefined,
      }),
    ).rejects.toThrow();
  });

  it('rejects operations on an unknown visit', async () => {
    await expect(
      new CancelVisitUseCase(new InMemoryVisitRepository(), clock).execute({ visitId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
