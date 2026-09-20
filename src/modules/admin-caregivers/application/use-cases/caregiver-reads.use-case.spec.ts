import { CaregiverStatus } from '@prisma/client';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CaregiverOverviewView,
  CaregiverPageView,
  CaregiverReadModel,
} from '../ports/caregiver-read.port';
import { GetCaregiverOverviewUseCase } from './get-caregiver-overview.use-case';
import { ListCaregiversUseCase } from './list-caregivers.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function overview(): CaregiverOverviewView {
  return {
    id: 'cg-1',
    reference: 'CG-001',
    userId: 'user-1',
    name: 'Sarah Williams',
    status: CaregiverStatus.ACTIVE,
    title: 'Certified Nursing Assistant (CNA)',
    branch: 'North Branch',
    employmentType: 'FULL_TIME',
    experienceYears: 6,
    joinedAt: new Date('2019-03-01T00:00:00.000Z'),
    gender: 'FEMALE',
    supervisorName: 'Mike Chen',
    maxHoursPerWeek: 45,
    preferredShift: 'Morning',
    preferencesNote: 'Prefers morning shifts.',
    hourlyRateMinor: 2850,
    payCurrency: 'USD',
    phone: '(555) 234-5678',
    email: 'sarah.williams@careprofs.com',
    address: '234 Maple Drive, Springfield, IL 62701',
    dateOfBirth: new Date('1988-06-15T00:00:00.000Z'),
    languages: ['English', 'Spanish'],
    emergencyContactName: 'Mark Williams',
    emergencyContactPhone: '(555) 234-5679',
    emergencyContactRelationship: 'Husband',
    emergencyContactEmail: 'mark.w@email.com',
    skills: ['Wound Care'],
    assignments: [
      {
        recipientName: 'Margaret Johnson',
        role: 'PRIMARY',
        since: new Date('2026-03-01T00:00:00.000Z'),
      },
    ],
    todaySchedule: [
      {
        startMinute: 480,
        recipientName: 'Margaret Johnson',
        visitType: 'PERSONAL_CARE',
        status: 'COMPLETED',
      },
    ],
    performance: {
      ratingAverage: 4.9,
      ratingCount: 40,
      visitsThisMonth: 42,
      hoursLoggedTenths: 1680,
      missedVisits: 0,
      completedVisits: 42,
    },
    certifications: [
      {
        id: 'cert-1',
        name: 'CNA License',
        licenseNumber: 'CNA-IL-45892',
        issuedAt: new Date('2024-12-01T00:00:00.000Z'),
        expiresAt: new Date('2026-12-31T00:00:00.000Z'),
        valid: true,
      },
    ],
    availability: [
      {
        date: new Date('2026-09-14T00:00:00.000Z'),
        slots: [{ startMinute: 420, endMinute: 1080 }],
      },
    ],
    recentNotes: [
      { body: 'Morning routine with Margaret completed.', authorName: 'Self', createdAt: NOW },
    ],
  };
}

function reads(found: CaregiverOverviewView | null): CaregiverReadModel {
  return {
    list: () =>
      Promise.resolve<CaregiverPageView>({
        total: 1,
        rows: [
          {
            id: 'cg-1',
            reference: 'CG-001',
            name: 'Sarah Williams',
            title: 'CNA',
            branch: 'North Branch',
            employmentType: 'FULL_TIME',
            status: CaregiverStatus.ACTIVE,
          },
        ],
      }),
    overview: () => Promise.resolve(found),
    scheduleTab: () => Promise.resolve(null),
  };
}

describe('ListCaregiversUseCase', () => {
  it('maps the directory rows', async () => {
    const result = await new ListCaregiversUseCase(reads(overview())).execute({
      status: null,
      page: 1,
      pageSize: 20,
    });
    expect(result.rows[0].reference).toBe('CG-001');
    expect(result.rows[0].employmentType).toBe('FULL_TIME');
  });
});

describe('GetCaregiverOverviewUseCase', () => {
  it('composes the overview with derived age, performance and availability', async () => {
    const result = await new GetCaregiverOverviewUseCase(reads(overview()), clock).execute('cg-1');
    expect(result.reference).toBe('CG-001');
    expect(result.supervisorName).toBe('Mike Chen');
    expect(result.maxHoursPerWeek).toBe(45);
    expect(result.preferredShift).toBe('Morning');
    expect(result.personal.gender).toBe('FEMALE');
    expect(result.personal.emergencyContactEmail).toBe('mark.w@email.com');
    expect(result.personal.age).toBe(38);
    expect(result.performance.satisfactionPercent).toBe(98);
    expect(result.performance.taskCompletionPercent).toBe(100);
    expect(result.performance.hoursLogged).toBe(168);
    expect(result.performance.punctualityPercent).toBeNull();
    expect(result.fullyCompliant).toBe(true);
    expect(result.todaySchedule[0].time).toBe('8:00 AM');
    const mon = result.availability.find((d) => d.dayLabel === 'Mon');
    expect(mon?.available).toBe(true);
    expect(mon?.slots[0].label).toBe('7:00 AM - 6:00 PM');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new GetCaregiverOverviewUseCase(reads(null), clock).execute('nope'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
