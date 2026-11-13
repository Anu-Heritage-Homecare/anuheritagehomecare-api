import { WorkforceReportResult } from '../../application/dto/workforce-report.result';
import { buildWorkforceReportPdf } from './workforce-report-pdf';
import { buildWorkforceReportXlsx } from './workforce-report-xlsx';

const report: WorkforceReportResult = {
  from: '2026-10-09T00:00:00.000Z',
  to: '2026-11-08T00:00:00.000Z',
  kpis: {
    activeCaregivers: 34,
    staffedPercent: 100,
    utilizationPercent: 87,
    utilizationTargetPercent: 85,
    attendancePercent: 97.2,
    avgPerformance: 4.7,
    trainingCompliancePercent: 92,
  },
  weeklyUtilization: [{ label: 'Week 1', utilizationPercent: 84 }],
  attendanceTrend: [{ date: '2026-10-09', attendancePercent: 97.8 }],
  ratingDistribution: [{ band: 'OUTSTANDING', caregivers: 12, percent: 35 }],
  topCaregivers: [
    {
      rank: 1,
      caregiverId: 'c1',
      name: 'Emma Watson, LPN',
      photoKey: null,
      rating: 4.9,
      visitsCompleted: 42,
      onTimeRatePercent: 98.5,
      attendancePercent: 100,
      csatScore: 5,
    },
  ],
  trainingCompliance: { compliant: 31, overdue: 3, compliantPercent: 91.2 },
  expiringCertifications: [
    {
      caregiverId: 'c3',
      caregiverName: 'Elena Rostova',
      credentialName: 'CNA State License',
      expiresAt: '2026-11-20T00:00:00.000Z',
      daysUntilExpiry: 12,
      status: 'ACTION_REQUIRED',
    },
  ],
  flaggedForReview: [
    {
      caregiverId: 'c5',
      name: 'Amelia Bedelia, CNA',
      photoKey: null,
      reason: 'Attendance rate 89.2%',
      attendancePercent: 89.2,
      lateArrivals: 3,
    },
  ],
};

describe('workforce report exports', () => {
  it('builds a non empty PDF with a dated filename', () => {
    const { filename, pdf } = buildWorkforceReportPdf(report);
    expect(filename).toBe('workforce-report-2026-10-09.pdf');
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('builds a non empty Excel workbook with a dated filename', () => {
    const { filename, xlsx } = buildWorkforceReportXlsx(report);
    expect(filename).toBe('workforce-report-2026-10-09.xlsx');
    expect(xlsx.length).toBeGreaterThan(0);
  });
});
