import { Clock } from '@shared/application/ports/clock.port';
import { OperationsReportResult } from '../dto/operations-report.result';
import {
  OperationsReportReadModel,
  OperationsReportView,
} from '../ports/operations-report-read.port';
import { GetOperationsReportUseCase } from './get-operations-report.use-case';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const FROM = new Date('2026-10-09T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(overrides: Partial<OperationsReportView> = {}): OperationsReportView {
  return {
    current: {
      total: 412,
      completed: 396,
      cancelled: 16,
      loggedSeconds: 300 * 144 * 60, // 300 completed visits averaging 144 minutes
      durationCount: 300,
    },
    previousTotal: 381,
    daily: [{ date: new Date('2026-10-09T00:00:00.000Z'), visits: 14 }],
    weekly: [{ label: 'W1', completed: 95, total: 100 }],
    cancellationReasons: [
      { reason: 'CLIENT_REQUEST', count: 6 },
      { reason: 'CAREGIVER_UNAVAILABLE', count: 4 },
      { reason: 'WEATHER', count: 3 },
      { reason: 'EMERGENCY', count: 2 },
      { reason: 'OTHER', count: 1 },
    ],
    serviceTypes: [
      { type: 'PERSONAL_CARE', count: 142 },
      { type: 'MEDICATION', count: 98 },
    ],
    locations: [
      {
        city: 'Portland Central',
        total: 128,
        completed: 125,
        loggedSeconds: 0,
        durationCount: 0,
        satisfactionSum: 243,
        satisfactionCount: 50,
        previousCompletionRate: 96,
      },
      {
        city: 'Tigard',
        total: 100,
        completed: 90,
        loggedSeconds: 0,
        durationCount: 0,
        satisfactionSum: 0,
        satisfactionCount: 0,
        previousCompletionRate: 95,
      },
      {
        city: 'Hillsboro',
        total: 60,
        completed: 50,
        loggedSeconds: 0,
        durationCount: 0,
        satisfactionSum: 0,
        satisfactionCount: 0,
        previousCompletionRate: null,
      },
    ],
    ...overrides,
  };
}

function reads(value: OperationsReportView): OperationsReportReadModel {
  return { report: () => Promise.resolve(value) };
}

function run(value = view()): Promise<OperationsReportResult> {
  return new GetOperationsReportUseCase(reads(value), clock).execute({
    from: FROM,
    to: NOW,
    visitType: null,
    caregiverId: null,
    status: null,
    city: null,
  });
}

describe('GetOperationsReportUseCase', () => {
  it('derives the visit performance cards over total visits', async () => {
    const result = await run();
    expect(result.visitPerformance).toEqual({
      totalVisits: 412,
      totalVisitsDeltaPercent: 8.1, // (412 - 381) / 381
      completed: 396,
      completedPercent: 96.1, // 396 / 412
      cancelled: 16,
      cancelledPercent: 3.9, // 16 / 412
      avgVisitDurationMinutes: 144,
    });
  });

  it('computes the weekly completion and cancellation shares', async () => {
    const result = await run();
    expect(result.weeklyCompletion[0]).toEqual({ label: 'W1', completionPercent: 95 });
    expect(result.cancellationReasons[0]).toEqual({
      reason: 'CLIENT_REQUEST',
      count: 6,
      percent: 37.5, // 6 / 16
    });
  });

  it('classifies the location trend against the previous period', async () => {
    const result = await run();
    const byCity = new Map(result.locationPerformance.map((l) => [l.location, l]));
    expect(byCity.get('Portland Central')).toMatchObject({
      completionPercent: 97.7, // 125 / 128, up from 96
      satisfactionAvg: 4.9, // 243 / 50
      trend: 'UP',
    });
    expect(byCity.get('Tigard')?.trend).toBe('DOWN'); // 90 down from 95
    expect(byCity.get('Hillsboro')?.trend).toBe('FLAT'); // no previous period
  });

  it('passes the service type breakdown through unchanged', async () => {
    const result = await run();
    expect(result.topServiceTypes).toEqual([
      { type: 'PERSONAL_CARE', count: 142 },
      { type: 'MEDICATION', count: 98 },
    ]);
  });
});
