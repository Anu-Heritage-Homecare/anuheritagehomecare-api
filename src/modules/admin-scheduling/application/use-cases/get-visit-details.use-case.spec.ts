import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { CareRatingRepository } from '@modules/care-ratings/domain/care-rating.repository';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { buildVisit, InMemoryVisitRepository } from '@modules/visits/test-support/doubles';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { GetVisitDetailsUseCase } from './get-visit-details.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock = { now: () => NOW };

function fakeUser(id: string, first: string, last: string, type: UserType): User {
  return {
    id,
    name: { firstName: first, lastName: last },
    phone: { value: '(555) 345-6789' },
    userType: type,
  } as unknown as User;
}

function recipient(): CareRecipient {
  return {
    id: 'recipient-1',
    ownerId: 'owner-1',
    profile: {
      name: 'Eleanor Davis',
      gender: 'FEMALE',
      dateOfBirth: new Date(Date.UTC(1955, 0, 1)),
      fullAddress: '789 Oak Avenue, Springfield, IL 62701',
      relationship: 'Daughter',
    },
    health: { medicalConditions: ["Parkinson's Disease"], allergies: ['Penicillin'] },
    careNeeds: ['MEAL_PREPARATION'],
    schedule: {
      frequency: CareFrequency.Weekly,
      days: [Weekday.Monday, Weekday.Wednesday, Weekday.Friday],
      startMinute: 570,
      visitDurationMinutes: 90,
      expectedDuration: '3 months',
    },
    medications: [{ name: 'Levodopa', dose: '100 mg', doseTimes: [480, 720] }],
  } as unknown as CareRecipient;
}

function userRepo(): UserRepository {
  const users = [
    fakeUser('caregiver-1', 'Maria', 'Garcia', UserType.Caregiver),
    fakeUser('owner-1', 'Jennifer', 'Davis', UserType.FamilyMember),
  ];
  return {
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(users.find((u) => u.id === id) ?? null),
    findByIds: (ids) => Promise.resolve(users.filter((u) => ids.includes(u.id))),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function profileRepo(): CaregiverProfileRepository {
  const profile = {
    title: 'CNA, Physical Therapy Specialist',
    branch: 'West',
  } as unknown as CaregiverProfile;
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve(profile),
  };
}

function recipientRepo(): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(recipient()),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function ratingRepo(): CareRatingRepository {
  return {
    save: () => Promise.resolve(),
    summarise: () => Promise.resolve({ average: null, count: 0 }),
    averageForCaregiver: () => Promise.resolve({ average: 4.8, count: 20 }),
  };
}

async function visitStore(): Promise<InMemoryVisitRepository> {
  const visits = new InMemoryVisitRepository();
  await visits.save(
    buildVisit({
      id: 'visit-1',
      caregiverId: 'caregiver-1',
      careRecipientId: 'recipient-1',
      date: '2026-07-24',
      startMinute: 570,
      endMinute: 660,
      type: VisitType.PhysicalTherapy,
      status: VisitStatus.InProgress,
      clockInAt: new Date(Date.UTC(2026, 6, 24, 9, 28)),
      tasks: [
        {
          label: 'Vital signs check',
          completed: true,
          completedAt: new Date(Date.UTC(2026, 6, 24, 9, 35)),
        },
        {
          label: 'Range of motion exercises',
          completed: true,
          completedAt: new Date(Date.UTC(2026, 6, 24, 9, 45)),
        },
        { label: 'Walking practice', completed: false },
      ],
    }),
  );
  // A previous completed visit and a next scheduled visit for the same recipient.
  await visits.save(
    buildVisit({
      id: 'visit-prev',
      caregiverId: 'caregiver-1',
      careRecipientId: 'recipient-1',
      date: '2026-07-22',
      startMinute: 540,
      endMinute: 600,
      type: VisitType.MorningCare,
      status: VisitStatus.Completed,
    }),
  );
  await visits.save(
    buildVisit({
      id: 'visit-next',
      caregiverId: 'caregiver-1',
      careRecipientId: 'recipient-1',
      date: '2026-07-25',
      startMinute: 660,
      endMinute: 720,
      type: VisitType.PhysicalTherapy,
      status: VisitStatus.Scheduled,
    }),
  );
  return visits;
}

function build(visits: InMemoryVisitRepository): GetVisitDetailsUseCase {
  return new GetVisitDetailsUseCase(
    visits,
    recipientRepo(),
    userRepo(),
    profileRepo(),
    ratingRepo(),
    clock,
  );
}

describe('GetVisitDetailsUseCase', () => {
  it('composes the overview, recipient, caregiver, timeline and related visits', async () => {
    const result = await build(await visitStore()).execute('visit-1');

    expect(result.serviceType).toBe('Physical Therapy');
    expect(result.actions.canEdit).toBe(false); // in progress

    expect(result.overview.information.recurring).toBe('Yes — Mon / Wed / Fri');
    expect(result.overview.information.durationHours).toBe(1.5);
    expect(result.overview.tasks.summary).toBe('2 of 3 completed');

    expect(result.recipient.name).toBe('Eleanor Davis');
    expect(result.recipient.age).toBe(71);
    expect(result.recipient.gender).toBe('Female');
    expect(result.recipient.primaryCondition).toBe("Parkinson's Disease");
    expect(result.recipient.careLevel).toBe('Part-Time');
    expect(result.recipient.emergencyContact?.name).toBe('Jennifer Davis');

    expect(result.caregiver?.name).toBe('Maria Garcia');
    expect(result.caregiver?.title).toBe('CNA, Physical Therapy Specialist');
    expect(result.caregiver?.onVisit).toBe(true);
    expect(result.caregiver?.performanceRating).toBe(4.8);
    expect(result.caregiver?.clockIn).toBe('9:28 AM');

    const types = result.history.map((e) => e.type);
    expect(types[0]).toBe('CLOCK_IN');
    expect(types).toContain('TASK');

    expect(result.relatedVisits.previous?.id).toBe('visit-prev');
    expect(result.relatedVisits.next?.id).toBe('visit-next');
    expect(result.carePlan.services).toEqual(['Meal Preparation']);
  });

  it('rejects an unknown visit', async () => {
    await expect(build(new InMemoryVisitRepository()).execute('nope')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
