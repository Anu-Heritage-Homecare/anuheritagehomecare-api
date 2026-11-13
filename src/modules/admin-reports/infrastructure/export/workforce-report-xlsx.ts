import { buildXlsx, XlsxCell } from '@shared/infrastructure/xlsx/xlsx';
import { WorkforceReportResult } from '../../application/dto/workforce-report.result';
import { percent, periodLabel, workforceSections } from './workforce-report-format';

/** Render the Workforce Report to a one sheet .xlsx workbook (the Export Excel action). */
export function buildWorkforceReportXlsx(report: WorkforceReportResult): {
  filename: string;
  xlsx: Buffer;
} {
  const rows: XlsxCell[][] = [['Workforce Report', periodLabel(report)], []];
  for (const section of workforceSections(report)) {
    rows.push([section.heading]);
    for (const row of section.rows) {
      rows.push([row.label, row.value]);
    }
    rows.push([]);
  }
  rows.push(['Top Caregivers']);
  rows.push(['Rank', 'Caregiver', 'Rating', 'Visits', 'On-Time', 'Attendance', 'CSAT']);
  for (const caregiver of report.topCaregivers) {
    rows.push([
      caregiver.rank,
      caregiver.name,
      caregiver.rating ?? 'n/a',
      caregiver.visitsCompleted,
      percent(caregiver.onTimeRatePercent),
      percent(caregiver.attendancePercent),
      caregiver.csatScore ?? 'n/a',
    ]);
  }
  rows.push([]);
  rows.push(['Expiring Certifications']);
  rows.push(['Caregiver', 'Credential', 'Expires', 'Days', 'Status']);
  for (const cert of report.expiringCertifications) {
    rows.push([
      cert.caregiverName,
      cert.credentialName,
      cert.expiresAt.slice(0, 10),
      cert.daysUntilExpiry,
      cert.status,
    ]);
  }

  return {
    filename: `workforce-report-${report.from.slice(0, 10)}.xlsx`,
    xlsx: buildXlsx('Workforce Report', rows),
  };
}
