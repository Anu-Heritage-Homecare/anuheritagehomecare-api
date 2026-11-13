import { WorkforceReportResult } from '../../application/dto/workforce-report.result';

export function periodLabel(report: WorkforceReportResult): string {
  return `${report.from.slice(0, 10)} to ${report.to.slice(0, 10)}`;
}

export function percent(value: number | null): string {
  return value === null ? 'n/a' : `${value}%`;
}

export function rating(value: number | null): string {
  return value === null ? 'n/a' : `${value}/5`;
}

export interface ExportSection {
  heading: string;
  rows: { label: string; value: string }[];
}

/** The summary cards of the report, shared by the PDF and the workbook. */
export function workforceSections(report: WorkforceReportResult): ExportSection[] {
  const k = report.kpis;
  return [
    {
      heading: 'Workforce Metrics',
      rows: [
        { label: 'Active Caregivers', value: String(k.activeCaregivers) },
        { label: 'Staffed', value: percent(k.staffedPercent) },
        { label: 'Utilization Rate', value: percent(k.utilizationPercent) },
        { label: 'Attendance Rate', value: percent(k.attendancePercent) },
        { label: 'Avg Performance', value: rating(k.avgPerformance) },
        { label: 'Training Compliance', value: percent(k.trainingCompliancePercent) },
      ],
    },
    {
      heading: 'Performance Rating Distribution',
      rows: report.ratingDistribution.map((band) => ({
        label: band.band,
        value: `${band.caregivers} (${band.percent}%)`,
      })),
    },
  ];
}
