import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { NoteAudience } from '@modules/visits/domain/note-audience.enum';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitBreak } from '@modules/visits/domain/value-objects/visit-break.vo';
import { VisitNote } from '@modules/visits/domain/value-objects/visit-note.vo';
import { VitalsReading } from '@modules/visits/domain/value-objects/vitals-reading.vo';
import { buildVisit } from '@modules/visits/test-support/doubles';
import { GetFamilyVisitDetailUseCase } from './get-family-visit-detail.use-case';
import { GetRecipientVisitsUseCase } from './get-recipient-visits.use-case';
import { fakeCareAccess } from '../../test-support/fake-care-access';

const NOW = new Date('2026-11-12T13:00:00.000Z');
const clock: Clock = { now: () => NOW };

const photoStorage: PhotoStorage = {
  createUploadTicket: () => ({ uploadUrl: 'https://upload', fields: {}, key: 'k' }),
  urlFor: (key: string) => `https://cdn.test/${key}`,
  download: (key: string) => Promise.resolve(Buffer.from(key)),
};

function recipient(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'r1',
    ownerId: 'owner-1',
    medications: [{ id: 'm1', name: 'Metformin' }],
    profile: {
      name: 'Mrs Moses Rose',
      gender: 'FEMALE',
      dateOfBirth: new Date('1944-01-01T00:00:00.000Z'),
      photoKey: null,
    },
    ...overrides,
  };
}

function recipientsRepo(record: Record<string, unknown>): CareRecipientRepository {
  return {
    findById: (id: string) => Promise.resolve((record[id] ?? null) as CareRecipient | null),
  } as unknown as CareRecipientRepository;
}

function usersRepo(): UserRepository {
  const user = {
    id: 'cg1',
    name: { firstName: 'Sarah Adams', lastName: 'John' },
    userType: UserType.Caregiver,
    photoKey: 'caregivers/cg1.jpg',
  };
  return {
    findById: (id: string) => Promise.resolve(id === 'cg1' ? user : null),
    findByIds: (ids: string[]) => Promise.resolve(ids.includes('cg1') ? [user] : []),
  } as unknown as UserRepository;
}

describe('family Care reads', () => {
  const completed = buildVisit({
    id: 'v1',
    careRecipientId: 'r1',
    caregiverId: 'cg1',
    status: VisitStatus.Completed,
    date: '2026-11-12',
    clockInAt: new Date('2026-11-12T09:22:00.000Z'),
    clockOutAt: new Date('2026-11-12T12:00:00.000Z'),
    tasks: [{ label: 'Assist with morning', completed: true }],
    vitals: [
      VitalsReading.create({
        systolic: 120,
        diastolic: 80,
        temperatureCelsius: 36.8,
        recordedAt: new Date('2026-11-12T09:50:00.000Z'),
      }),
    ],
    notes: [
      VisitNote.create({
        authorId: 'cg1',
        audience: NoteAudience.CareTeam,
        text: 'Mary was cheerful today.',
        createdAt: new Date('2026-11-12T11:00:00.000Z'),
      }),
    ],
    photoKeys: ['anu/visits/v1/p1.jpg'],
  });

  describe('GetFamilyVisitDetailUseCase', () => {
    it('returns the full detail for an owned visit', async () => {
      const visits = {
        findById: (id: string) => Promise.resolve(id === 'v1' ? completed : null),
      } as unknown as VisitRepository;
      const useCase = new GetFamilyVisitDetailUseCase(
        visits,
        recipientsRepo({ r1: recipient() }),
        usersRepo(),
        photoStorage,
        clock,
        fakeCareAccess(),
      );

      const result = await useCase.execute({ callerUserId: 'owner-1', visitId: 'v1' });

      expect(result.recipient.name).toBe('Mrs Moses Rose');
      expect(result.caregiver).toEqual({
        id: 'cg1',
        name: 'Sarah Adams John',
        photoKey: 'caregivers/cg1.jpg',
      });
      expect(result.health.vitals?.temperatureCelsius).toBe(36.8);
      expect(result.health.vitals?.systolic).toBe(120);
      // Timeline is chronological: arrival first, departure last.
      expect(result.timeline[0]).toMatchObject({ kind: 'ARRIVED', label: 'Arrives at home' });
      expect(result.timeline.at(-1)).toMatchObject({ kind: 'DEPARTED' });
      expect(result.timeline.some((event) => event.kind === 'VITALS')).toBe(true);
      expect(result.notes[0]).toEqual({
        authorId: 'cg1',
        authorName: 'Sarah Adams John',
        authorRole: 'CAREGIVER',
        authorPhotoKey: 'caregivers/cg1.jpg',
        at: '2026-11-12T11:00:00.000Z',
        audience: 'CARE_TEAM',
        text: 'Mary was cheerful today.',
      });
      expect(result.photos).toEqual([
        { key: 'anu/visits/v1/p1.jpg', url: 'https://cdn.test/anu/visits/v1/p1.jpg' },
      ]);
    });

    it('adds break events and shows unfinished tasks as upcoming steps', async () => {
      const inProgress = buildVisit({
        id: 'v3',
        careRecipientId: 'r1',
        caregiverId: 'cg1',
        status: VisitStatus.InProgress,
        date: '2026-11-12',
        clockInAt: new Date('2026-11-12T09:05:00.000Z'),
        tasks: [
          {
            label: 'Breakfast',
            completed: true,
            completedAt: new Date('2026-11-12T09:30:00.000Z'),
            durationMinutes: 20,
          },
          { label: 'Walk', completed: false },
        ],
        breaks: [
          VisitBreak.rehydrate(
            new Date('2026-11-12T10:00:00.000Z'),
            new Date('2026-11-12T10:15:00.000Z'),
          ),
        ],
      });
      const visits = {
        findById: (id: string) => Promise.resolve(id === 'v3' ? inProgress : null),
      } as unknown as VisitRepository;
      const useCase = new GetFamilyVisitDetailUseCase(
        visits,
        recipientsRepo({ r1: recipient() }),
        usersRepo(),
        photoStorage,
        clock,
        fakeCareAccess(),
      );

      const result = await useCase.execute({ callerUserId: 'owner-1', visitId: 'v3' });

      const breaks = result.timeline.filter((event) => event.kind === 'BREAK');
      expect(breaks.map((event) => event.label)).toEqual(['Break started', 'Break ended']);

      // A completed task with a recorded duration shows it as the event detail.
      const breakfast = result.timeline.find((event) => event.label === 'Breakfast completed');
      expect(breakfast?.detail).toBe('20 Minutes');

      const upcoming = result.timeline.filter((event) => event.status === 'UPCOMING');
      expect(upcoming).toEqual([
        { at: null, kind: 'TASK', status: 'UPCOMING', label: 'Walk', detail: null },
      ]);
      // Upcoming steps always sort after the recorded events.
      expect(result.timeline.at(-1)?.status).toBe('UPCOMING');
    });

    it('hides a visit whose recipient the owner does not own', async () => {
      const visits = {
        findById: () => Promise.resolve(completed),
      } as unknown as VisitRepository;
      const useCase = new GetFamilyVisitDetailUseCase(
        visits,
        recipientsRepo({ r1: recipient({ ownerId: 'someone-else' }) }),
        usersRepo(),
        photoStorage,
        clock,
        fakeCareAccess(),
      );

      await expect(
        useCase.execute({ callerUserId: 'owner-1', visitId: 'v1' }),
      ).rejects.toBeInstanceOf(NotFoundDomainException);
    });
  });

  describe('GetRecipientVisitsUseCase', () => {
    it('splits the current visit from past visits', async () => {
      const inProgress = buildVisit({
        id: 'v2',
        careRecipientId: 'r1',
        caregiverId: 'cg1',
        status: VisitStatus.InProgress,
        date: '2026-11-12',
      });
      const visits = {
        listForCareRecipientsInRange: () => Promise.resolve([completed, inProgress]),
      } as unknown as VisitRepository;
      const useCase = new GetRecipientVisitsUseCase(
        recipientsRepo({ r1: recipient() }),
        visits,
        usersRepo(),
        fakeCareAccess(),
      );

      const result = await useCase.execute({ callerUserId: 'owner-1', careRecipientId: 'r1' });

      expect(result.currentVisit?.id).toBe('v2');
      expect(result.pastVisits.map((visit) => visit.id)).toEqual(['v1']);
      expect(result.pastVisits[0].caregiver?.name).toBe('Sarah Adams John');
      expect(result.currentVisit?.caregiver?.photoKey).toBe('caregivers/cg1.jpg');
    });

    it('hides a recipient the owner does not own', async () => {
      const visits = {
        listForCareRecipientsInRange: () => Promise.resolve([]),
      } as unknown as VisitRepository;
      const useCase = new GetRecipientVisitsUseCase(
        recipientsRepo({ r1: recipient({ ownerId: 'someone-else' }) }),
        visits,
        usersRepo(),
        fakeCareAccess(),
      );

      await expect(
        useCase.execute({ callerUserId: 'owner-1', careRecipientId: 'r1' }),
      ).rejects.toBeInstanceOf(NotFoundDomainException);
    });
  });
});
