import { ReportsOverviewResult } from '../../application/dto/reports-overview.result';
import { buildReportsOverviewPdf } from './reports-overview-pdf';
import { buildReportsOverviewXlsx } from './reports-overview-xlsx';

const report: ReportsOverviewResult = {
  currency: 'NGN',
  from: '2026-10-09T00:00:00.000Z',
  to: '2026-11-08T00:00:00.000Z',
  kpis: {
    totalVisits: 100,
    caregiverUtilizationPercent: 42,
    revenueMinor: 28_450_000,
    clientSatisfactionAvg: 4.5,
    visitCompletionPercent: 94.7,
    outstandingMinor: 4_230_000,
  },
  monthlyPerformance: [
    { monthStart: '2026-11-01T00:00:00.000Z', completionPercent: 96, utilizationPercent: 42 },
  ],
  revenueOverview: {
    ytdRevenueMinor: 48_450_000,
    monthly: [{ monthStart: '2026-11-01T00:00:00.000Z', revenueMinor: 5_240_000 }],
  },
  operationalPerformance: {
    visitsThisMonth: 412,
    avgVisitDurationMinutes: 120,
    onTimeRatePercent: 95,
    cancellationRatePercent: 5,
  },
  workforceSummary: {
    activeCaregivers: 34,
    avgRating: 4.5,
    trainingCompliancePercent: 94.1,
    attendanceRatePercent: 97,
  },
  financialSummary: {
    monthlyRevenueMinor: 5_240_000,
    collectionRatePercent: 94.8,
    avgInvoiceMinor: 300_000,
    outstandingMinor: 4_230_000,
  },
  satisfactionBreakdown: [
    { score: 1, count: 2, percent: 2 },
    { score: 2, count: 3, percent: 3 },
    { score: 3, count: 5, percent: 5 },
    { score: 4, count: 20, percent: 20 },
    { score: 5, count: 70, percent: 70 },
  ],
  recentReports: [],
};

describe('reports overview exports', () => {
  it('builds a non empty PDF with a dated filename', () => {
    const { filename, pdf } = buildReportsOverviewPdf(report);
    expect(filename).toBe('operations-report-2026-10-09.pdf');
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('builds a non empty Excel workbook with a dated filename', () => {
    const { filename, xlsx } = buildReportsOverviewXlsx(report);
    expect(filename).toBe('operations-report-2026-10-09.xlsx');
    expect(xlsx.length).toBeGreaterThan(0);
  });
});
