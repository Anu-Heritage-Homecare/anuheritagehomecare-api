import { CaregiverAvailability } from '@modules/availability/domain/caregiver-availability.entity';
import { CaregiverAvailabilityRepository } from '@modules/availability/domain/caregiver-availability.repository';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CaregiverReadModel, CaregiverScheduleTabView } from '../ports/caregiver-read.port';
import { GetCaregiverScheduleUseCase } from './get-caregiver-schedule.use-case';
import { SetCaregiverAvailabilityUseCase } from './set-caregiver-availability.use-case';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-07-22T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function tabView(weekStart: Date): CaregiverScheduleTabView {
  const day = (index: number): Date => new Date(weekStart.getTime() + index * DAY_MS);
  return {
    weekStart,
    weekEnd: new Date(weekStart.getTime() + 7 * DAY_MS),
    maxHoursPerWeek: 40,
    preferredShift: 'Morning shift',
    overtimeMultiplierBps: 15_000,
    weekVisits: [
      {
        scheduledDate: day(0),
        startMinute: 480,
        endMinute: 600,
        recipientName: 'Margaret Johnson',
        visitType: 'PERSONAL_CARE',
        status: 'SCHEDULED',
      },
      {
        scheduledDate: day(5),
        startMinute: 600,
        endMinute: 720,
        recipientName: 'Robert Chen',
        visitType: 'MEDICATION',
        status: 'SCHEDULED',
      },
    ],
    upcomingVisits: [
      {
        scheduledDate: day(0),
        startMinute: 480,
        endMinute: 600,
        recipientName: 'Margaret Johnson',
        visitType: 'PERSONAL_CARE',
        status: 'SCHEDULED',
      },
    ],
    availability: [
      { date: day(0), slots: [{ startMinute: 420, endMinute: 1080 }] },
      { date: day(5), slots: [{ startMinute: 480, endMinute: 840 }] },
    ],
  };
}

function reads(view: CaregiverScheduleTabView | null): CaregiverReadModel {
  return {
    list: () => Promise.resolve({ total: 0, rows: [] }),
    overview: () => Promise.resolve(null),
    scheduleTab: (_id, weekStart) =>
      Promise.resolve(
        view === null
          ? null
          : { ...view, weekStart, weekEnd: new Date(weekStart.getTime() + 7 * DAY_MS) },
      ),
    performanceTab: () => Promise.resolve(null),
    documentsTab: () => Promise.resolve(null),
  };
}

describe('GetCaregiverScheduleUseCase', () => {
  it('composes the week summary, calendar, upcoming visits and availability settings', async () => {
    const weekStart = new Date('2026-07-20T00:00:00.000Z');
    const result = await new GetCaregiverScheduleUseCase(reads(tabView(weekStart)), clock).execute({
      profileId: 'cg-1',
      weekOf: null,
    });

    expect(result.summary.hoursScheduled).toBe(4);
    expect(result.summary.targetHours).toBe(40);
    expect(result.summary.loadPercent).toBe(10);
    expect(result.summary.visitsScheduled).toBe(2);
    expect(result.summary.allConfirmed).toBe(true);
    expect(result.summary.availabilityDayRange).toBe('Mon - Sat');

    expect(result.days).toHaveLength(7);
    const mon = result.days[0];
    expect(mon.offDuty).toBe(false);
    expect(mon.visits[0].status).toBe('Confirmed');
    expect(result.days[6].offDuty).toBe(true);

    expect(result.upcomingVisits[0].durationHours).toBe(2);
    expect(result.upcomingVisits[0].status).toBe('Confirmed');

    const settings = result.availabilitySettings;
    expect(settings.days[0].window).toBe('7:00 AM - 6:00 PM');
    expect(settings.days[6].available).toBe(false);
    expect(settings.overtimeEligible).toBe(true);
    expect(settings.overtimeRate).toBe(1.5);
    expect(settings.preferredShift).toBe('Morning shift');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new GetCaregiverScheduleUseCase(reads(null), clock).execute({
        profileId: 'nope',
        weekOf: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

function profileRepo(profile: CaregiverProfile | null): CaregiverProfileRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(profile),
    findByUserId: () => Promise.resolve(null),
  };
}

function availabilityRepo(): CaregiverAvailabilityRepository & { saved: CaregiverAvailability[] } {
  const saved: CaregiverAvailability[] = [];
  return {
    saved,
    findByCaregiverAndDate: () => Promise.resolve(null),
    listForCaregiverInRange: () => Promise.resolve([]),
    save: (a) => {
      saved.push(a);
      return Promise.resolve();
    },
  };
}

describe('SetCaregiverAvailabilityUseCase', () => {
  const ids = { generate: () => 'avail-new' };

  it('replaces the availability for each supplied day', async () => {
    const profile = CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
    const store = availabilityRepo();
    await new SetCaregiverAvailabilityUseCase(profileRepo(profile), store, ids, clock).execute({
      profileId: 'cg-1',
      days: [
        {
          date: new Date('2026-07-20T00:00:00.000Z'),
          slots: [{ startMinute: 420, endMinute: 1080 }],
        },
        {
          date: new Date('2026-07-25T00:00:00.000Z'),
          slots: [{ startMinute: 480, endMinute: 840 }],
        },
      ],
    });
    expect(store.saved).toHaveLength(2);
    expect(store.saved[0].caregiverId).toBe('user-1');
    expect(store.saved[0].slots[0].startMinute).toBe(420);
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new SetCaregiverAvailabilityUseCase(
        profileRepo(null),
        availabilityRepo(),
        ids,
        clock,
      ).execute({
        profileId: 'nope',
        days: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
