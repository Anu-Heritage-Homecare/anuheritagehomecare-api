import { Clock } from '@shared/application/ports/clock.port';
import { WorkforceReportResult } from '../dto/workforce-report.result';
import {
  WorkforceCaregiverAggregate,
  WorkforceReportReadModel,
  WorkforceReportView,
} from '../ports/workforce-report-read.port';
import { GetWorkforceReportUseCase } from './get-workforce-report.use-case';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const FROM = new Date('2026-10-09T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

function caregiver(over: Partial<WorkforceCaregiverAggregate>): WorkforceCaregiverAggregate {
  return {
    caregiverId: 'c',
    name: 'Caregiver',
    photoKey: null,
    visitsTotal: 0,
    visitsCompleted: 0,
    visitsMissed: 0,
    started: 0,
    onTime: 0,
    loggedSeconds: 0,
    ratingSum: 0,
    ratingCount: 0,
    csatSum: 0,
    csatCount: 0,
    hasIncompleteTraining: false,
    ...over,
  };
}

const CAREGIVERS: WorkforceCaregiverAggregate[] = [
  caregiver({
    caregiverId: 'c1',
    name: 'Emma Watson, LPN',
    visitsTotal: 42,
    visitsCompleted: 42,
    started: 42,
    onTime: 41,
    loggedSeconds: 42 * 7200,
    ratingSum: 49,
    ratingCount: 10, // 4.9 OUTSTANDING
    csatSum: 50,
    csatCount: 10,
  }),
  caregiver({
    caregiverId: 'c2',
    name: 'Marcus Aurelius, CNA',
    visitsTotal: 38,
    visitsCompleted: 38,
    started: 38,
    onTime: 38,
    loggedSeconds: 38 * 7200,
    ratingSum: 42,
    ratingCount: 10, // 4.2 GOOD
    csatSum: 48,
    csatCount: 10,
  }),
  caregiver({
    caregiverId: 'c3',
    name: 'Elena Rostova',
    visitsTotal: 45,
    visitsCompleted: 44,
    visitsMissed: 1,
    started: 45,
    onTime: 43,
    loggedSeconds: 44 * 7200,
    ratingSum: 37,
    ratingCount: 10, // 3.7 SATISFACTORY
    csatSum: 38,
    csatCount: 10,
  }),
  caregiver({
    caregiverId: 'c4',
    name: 'Regina Hall',
    visitsTotal: 20,
    visitsCompleted: 18,
    visitsMissed: 2,
    started: 20,
    onTime: 20,
    loggedSeconds: 18 * 7200,
    ratingSum: 32,
    ratingCount: 10, // 3.2 NEEDS_IMPROVEMENT -> flagged
    csatSum: 30,
    csatCount: 10,
    hasIncompleteTraining: true,
  }),
  caregiver({
    caregiverId: 'c5',
    name: 'Amelia Bedelia, CNA',
    visitsTotal: 28,
    visitsCompleted: 25,
    visitsMissed: 3, // attendance 89.3% -> flagged, unrated
    started: 28,
    onTime: 28,
    loggedSeconds: 25 * 7200,
  }),
  caregiver({
    caregiverId: 'c6',
    name: 'Johnathan Swift',
    visitsTotal: 30,
    visitsCompleted: 30,
    started: 30,
    onTime: 25, // 5 late arrivals -> flagged
    loggedSeconds: 30 * 7200,
    ratingSum: 40,
    ratingCount: 10, // 4.0 GOOD
    csatSum: 40,
    csatCount: 10,
  }),
];

function view(over: Partial<WorkforceReportView> = {}): WorkforceReportView {
  return {
    caregivers: CAREGIVERS,
    totalCaregivers: 6,
    weeklyCapacityHours: 240,
    weekly: [{ label: 'Week 1', loggedSeconds: 100 * 7200, days: 7 }],
    attendanceDaily: [{ date: new Date('2026-10-09T00:00:00.000Z'), total: 10, nonMissed: 9 }],
    expiringCertifications: [
      {
        caregiverId: 'c3',
        caregiverName: 'Elena Rostova',
        credentialName: 'CNA State License',
        expiresAt: new Date('2026-11-20T00:00:00.000Z'),
        daysUntilExpiry: 12, // ACTION_REQUIRED
      },
      {
        caregiverId: 'c4',
        caregiverName: 'Regina Hall',
        credentialName: 'BLS / CPR',
        expiresAt: new Date('2026-12-02T00:00:00.000Z'),
        daysUntilExpiry: 24, // GRACE_PERIOD
      },
      {
        caregiverId: 'c1',
        caregiverName: 'Emma Watson',
        credentialName: 'RN State Registration',
        expiresAt: new Date('2026-12-13T00:00:00.000Z'),
        daysUntilExpiry: 35, // SCHEDULED
      },
    ],
    ...over,
  };
}

function reads(value: WorkforceReportView): WorkforceReportReadModel {
  return { report: () => Promise.resolve(value) };
}

function run(value = view()): Promise<WorkforceReportResult> {
  return new GetWorkforceReportUseCase(reads(value), clock).execute({
    from: FROM,
    to: NOW,
    branch: null,
    caregiverId: null,
    employmentType: null,
  });
}

describe('GetWorkforceReportUseCase', () => {
  it('derives the KPI strip', async () => {
    const result = await run();
    expect(result.kpis).toMatchObject({
      activeCaregivers: 6,
      staffedPercent: 100, // 6 / 6
      avgPerformance: 4, // 200 / 50
      trainingCompliancePercent: 83.3, // 5 of 6 compliant
      utilizationTargetPercent: 85,
    });
    expect(result.kpis.utilizationPercent).not.toBeNull();
    expect(result.kpis.attendancePercent).toBe(97); // 197 / 203
  });

  it('bands the performance rating distribution over rated caregivers', async () => {
    const result = await run();
    const byBand = new Map(result.ratingDistribution.map((d) => [d.band, d]));
    expect(byBand.get('OUTSTANDING')).toEqual({ band: 'OUTSTANDING', caregivers: 1, percent: 20 });
    expect(byBand.get('GOOD')).toEqual({ band: 'GOOD', caregivers: 2, percent: 40 });
    expect(byBand.get('SATISFACTORY')).toEqual({
      band: 'SATISFACTORY',
      caregivers: 1,
      percent: 20,
    });
    expect(byBand.get('NEEDS_IMPROVEMENT')).toEqual({
      band: 'NEEDS_IMPROVEMENT',
      caregivers: 1,
      percent: 20,
    });
  });

  it('ranks the top caregivers by rating then visits then CSAT', async () => {
    const result = await run();
    expect(result.topCaregivers.map((c) => c.name)).toEqual([
      'Emma Watson, LPN',
      'Marcus Aurelius, CNA',
      'Johnathan Swift',
      'Elena Rostova',
      'Regina Hall',
      'Amelia Bedelia, CNA', // unrated, ranked last
    ]);
    expect(result.topCaregivers[0]).toMatchObject({ rank: 1, rating: 4.9, csatScore: 5 });
  });

  it('maps training compliance and certification urgency', async () => {
    const result = await run();
    expect(result.trainingCompliance).toEqual({ compliant: 5, overdue: 1, compliantPercent: 83.3 });
    expect(result.expiringCertifications.map((c) => c.status)).toEqual([
      'ACTION_REQUIRED',
      'GRACE_PERIOD',
      'SCHEDULED',
    ]);
  });

  it('flags caregivers by attendance, lateness or rating', async () => {
    const result = await run();
    const byName = new Map(result.flaggedForReview.map((f) => [f.name, f]));
    expect(result.flaggedForReview).toHaveLength(3);
    expect(byName.get('Amelia Bedelia, CNA')?.reason).toContain('Attendance');
    expect(byName.get('Johnathan Swift')?.reason).toContain('late arrivals');
    expect(byName.get('Regina Hall')?.reason).toContain('Scorecard rating');
  });
});
