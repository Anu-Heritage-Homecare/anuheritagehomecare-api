import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { ReportsOverviewResult } from '../dto/reports-overview.result';
import {
  ReportActivityRow,
  GeneratedReportRepository,
} from '../../domain/generated-report.repository';
import {
  ReportsAggregateView,
  ReportsOverviewReadModel,
  VisitAggregate,
} from '../ports/reports-overview-read.port';
import { GetReportsOverviewUseCase } from './get-reports-overview.use-case';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const FROM = new Date('2026-10-09T00:00:00.000Z'); // 30 days before NOW
const clock: Clock = { now: () => NOW };

function visits(overrides: Partial<VisitAggregate> = {}): VisitAggregate {
  return {
    total: 100,
    completed: 90,
    cancelled: 5,
    missed: 3,
    started: 80,
    onTime: 76,
    loggedSeconds: 90 * 7200, // 90 completed visits of 2 hours
    durationCount: 90,
    ...overrides,
  };
}

function view(overrides: Partial<ReportsAggregateView> = {}): ReportsAggregateView {
  return {
    currency: 'NGN',
    range: visits(),
    visitsThisMonth: 412,
    monthly: [
      {
        monthStart: new Date('2026-11-01T00:00:00.000Z'),
        visits: visits({ total: 50, completed: 48, cancelled: 0, loggedSeconds: 48 * 7200 }),
      },
    ],
    ratingCounts: [2, 3, 5, 20, 70],
    ratingSum: 453,
    ratingCount: 100,
    activeCaregivers: 34,
    weeklyCapacityHours: 100,
    caregiversWithExpiredCerts: 2,
    revenueMinor: 28_450_000,
    ytdRevenueMinor: 48_450_000,
    currentMonthRevenueMinor: 5_240_000,
    monthlyRevenue: [{ monthStart: new Date('2026-11-01T00:00:00.000Z'), revenueMinor: 5_240_000 }],
    billedMinor: 30_000_000,
    invoiceCount: 100,
    outstandingMinor: 4_230_000,
    ...overrides,
  };
}

function reads(value: ReportsAggregateView): ReportsOverviewReadModel {
  return { aggregate: () => Promise.resolve(value) };
}

function reports(rows: ReportActivityRow[]): GeneratedReportRepository {
  return { save: () => Promise.resolve(), listRecent: () => Promise.resolve(rows) };
}

describe('GetReportsOverviewUseCase', () => {
  function run(value = view(), recent: ReportActivityRow[] = []): Promise<ReportsOverviewResult> {
    return new GetReportsOverviewUseCase(reads(value), reports(recent), clock).execute({
      currency: Currency.NigerianNaira,
      from: FROM,
      to: NOW,
    });
  }

  it('derives the KPI strip from the aggregates', async () => {
    const result = await run();
    expect(result.kpis).toMatchObject({
      totalVisits: 100,
      revenueMinor: 28_450_000,
      clientSatisfactionAvg: 4.5,
      visitCompletionPercent: 94.7, // 90 / (100 - 5)
      outstandingMinor: 4_230_000,
    });
    // utilization: 180 logged hours / (100 * 30 / 7) capacity hours
    expect(result.kpis.caregiverUtilizationPercent).toBe(42);
  });

  it('derives the operational and workforce cards', async () => {
    const result = await run();
    expect(result.operationalPerformance).toMatchObject({
      visitsThisMonth: 412,
      avgVisitDurationMinutes: 120,
      onTimeRatePercent: 95, // 76 / 80
      cancellationRatePercent: 5, // 5 / 100
    });
    expect(result.workforceSummary).toMatchObject({
      activeCaregivers: 34,
      avgRating: 4.5,
      trainingCompliancePercent: 94.1, // (34 - 2) / 34
      attendanceRatePercent: 97, // (100 - 3) / 100
    });
  });

  it('derives the financial card and the satisfaction breakdown', async () => {
    const result = await run();
    expect(result.financialSummary).toMatchObject({
      monthlyRevenueMinor: 5_240_000,
      collectionRatePercent: 94.8, // 28_450_000 / 30_000_000
      avgInvoiceMinor: 300_000,
      outstandingMinor: 4_230_000,
    });
    const topStar = result.satisfactionBreakdown.find((r) => r.score === 5);
    expect(topStar).toEqual({ score: 5, count: 70, percent: 70 });
  });

  it('returns null rates when the denominators are zero', async () => {
    const empty = view({
      range: visits({
        total: 0,
        completed: 0,
        cancelled: 0,
        missed: 0,
        started: 0,
        onTime: 0,
        loggedSeconds: 0,
        durationCount: 0,
      }),
      ratingCount: 0,
      ratingSum: 0,
      ratingCounts: [0, 0, 0, 0, 0],
      billedMinor: 0,
      invoiceCount: 0,
    });
    const result = await run(empty);
    expect(result.kpis.visitCompletionPercent).toBeNull();
    expect(result.kpis.clientSatisfactionAvg).toBeNull();
    expect(result.operationalPerformance.onTimeRatePercent).toBeNull();
    expect(result.financialSummary.collectionRatePercent).toBeNull();
    expect(result.financialSummary.avgInvoiceMinor).toBeNull();
    expect(result.satisfactionBreakdown.every((r) => r.percent === 0)).toBe(true);
  });

  it('maps the recent report activity feed', async () => {
    const result = await run(view(), [
      {
        id: 'r1',
        type: 'OPERATIONS',
        title: 'Operations Report',
        format: 'PDF',
        generatedAt: new Date('2026-11-07T10:00:00.000Z'),
        generatedByLabel: 'Operations Manager',
      },
    ]);
    expect(result.recentReports[0]).toMatchObject({
      id: 'r1',
      title: 'Operations Report',
      generatedByLabel: 'Operations Manager',
      generatedAt: '2026-11-07T10:00:00.000Z',
    });
  });
});
