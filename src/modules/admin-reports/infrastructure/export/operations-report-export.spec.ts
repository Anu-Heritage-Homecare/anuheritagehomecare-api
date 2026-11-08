import { OperationsReportResult } from '../../application/dto/operations-report.result';
import { buildOperationsReportPdf } from './operations-report-pdf';
import { buildOperationsReportXlsx } from './operations-report-xlsx';

const report: OperationsReportResult = {
  from: '2026-10-09T00:00:00.000Z',
  to: '2026-11-08T00:00:00.000Z',
  visitPerformance: {
    totalVisits: 412,
    totalVisitsDeltaPercent: 8.1,
    completed: 396,
    completedPercent: 96.1,
    cancelled: 16,
    cancelledPercent: 3.9,
    avgVisitDurationMinutes: 144,
  },
  dailyTrend: [{ date: '2026-10-09', visits: 14 }],
  weeklyCompletion: [{ label: 'W1', completionPercent: 95 }],
  cancellationReasons: [{ reason: 'CLIENT_REQUEST', count: 6, percent: 37.5 }],
  topServiceTypes: [{ type: 'PERSONAL_CARE', count: 142 }],
  locationPerformance: [
    {
      location: 'Portland Central',
      totalVisits: 128,
      completionPercent: 97.7,
      avgVisitDurationMinutes: 138,
      satisfactionAvg: 4.9,
      trend: 'UP',
    },
  ],
};

describe('operations report exports', () => {
  it('builds a non empty PDF with a dated filename', () => {
    const { filename, pdf } = buildOperationsReportPdf(report);
    expect(filename).toBe('operations-report-2026-10-09.pdf');
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('builds a non empty Excel workbook with a dated filename', () => {
    const { filename, xlsx } = buildOperationsReportXlsx(report);
    expect(filename).toBe('operations-report-2026-10-09.xlsx');
    expect(xlsx.length).toBeGreaterThan(0);
  });
});
