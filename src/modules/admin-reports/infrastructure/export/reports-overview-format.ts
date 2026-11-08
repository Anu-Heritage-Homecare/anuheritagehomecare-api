import { money } from '@modules/admin-billing/infrastructure/pdf/format';
import { ReportsOverviewResult } from '../../application/dto/reports-overview.result';

/** A labelled value row, grouped under a section heading, for the exports. */
export interface ExportSection {
  heading: string;
  rows: { label: string; value: string }[];
}

export function periodLabel(report: ReportsOverviewResult): string {
  return `${report.from.slice(0, 10)} to ${report.to.slice(0, 10)}`;
}

function percent(value: number | null): string {
  return value === null ? 'n/a' : `${value}%`;
}

function rating(value: number | null): string {
  return value === null ? 'n/a' : `${value}/5`;
}

function minutes(value: number | null): string {
  return value === null ? 'n/a' : `${value} min`;
}

/** The report flattened into labelled sections shared by the PDF and the workbook. */
export function overviewSections(report: ReportsOverviewResult): ExportSection[] {
  const c = report.currency;
  return [
    {
      heading: 'Key Metrics',
      rows: [
        { label: 'Total Visits', value: String(report.kpis.totalVisits) },
        { label: 'Caregiver Utilization', value: percent(report.kpis.caregiverUtilizationPercent) },
        { label: 'Revenue', value: money(report.kpis.revenueMinor, c) },
        { label: 'Client Satisfaction', value: rating(report.kpis.clientSatisfactionAvg) },
        { label: 'Visit Completion', value: percent(report.kpis.visitCompletionPercent) },
        { label: 'Outstanding Invoices', value: money(report.kpis.outstandingMinor, c) },
      ],
    },
    {
      heading: 'Operational Performance',
      rows: [
        {
          label: 'Visits This Month',
          value: String(report.operationalPerformance.visitsThisMonth),
        },
        {
          label: 'Avg Duration',
          value: minutes(report.operationalPerformance.avgVisitDurationMinutes),
        },
        { label: 'On-Time Rate', value: percent(report.operationalPerformance.onTimeRatePercent) },
        {
          label: 'Cancellation Rate',
          value: percent(report.operationalPerformance.cancellationRatePercent),
        },
      ],
    },
    {
      heading: 'Workforce Summary',
      rows: [
        { label: 'Active Caregivers', value: String(report.workforceSummary.activeCaregivers) },
        { label: 'Avg Rating', value: rating(report.workforceSummary.avgRating) },
        {
          label: 'Training Compliance',
          value: percent(report.workforceSummary.trainingCompliancePercent),
        },
        { label: 'Attendance Rate', value: percent(report.workforceSummary.attendanceRatePercent) },
      ],
    },
    {
      heading: 'Financial Summary',
      rows: [
        { label: 'Monthly Revenue', value: money(report.financialSummary.monthlyRevenueMinor, c) },
        { label: 'Collection Rate', value: percent(report.financialSummary.collectionRatePercent) },
        {
          label: 'Avg Invoice',
          value:
            report.financialSummary.avgInvoiceMinor === null
              ? 'n/a'
              : money(report.financialSummary.avgInvoiceMinor, c),
        },
        { label: 'Outstanding', value: money(report.financialSummary.outstandingMinor, c) },
      ],
    },
    {
      heading: 'Client Satisfaction Breakdown',
      rows: report.satisfactionBreakdown.map((row) => ({
        label: `${row.score} star`,
        value: `${row.count} (${row.percent}%)`,
      })),
    },
  ];
}
