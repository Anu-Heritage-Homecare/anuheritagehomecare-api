import { OperationsReportResult } from '../../application/dto/operations-report.result';

export function periodLabel(report: OperationsReportResult): string {
  return `${report.from.slice(0, 10)} to ${report.to.slice(0, 10)}`;
}

export function percent(value: number | null): string {
  return value === null ? 'n/a' : `${value}%`;
}

export function minutesLabel(value: number | null): string {
  return value === null ? 'n/a' : `${value} min`;
}

export interface ExportSection {
  heading: string;
  rows: { label: string; value: string }[];
}

/** The non tabular parts of the report, shared by the PDF and the workbook. */
export function operationsSections(report: OperationsReportResult): ExportSection[] {
  const p = report.visitPerformance;
  return [
    {
      heading: 'Visit Performance',
      rows: [
        { label: 'Total Visits', value: String(p.totalVisits) },
        { label: 'Completed', value: `${p.completed} (${percent(p.completedPercent)})` },
        { label: 'Cancelled', value: `${p.cancelled} (${percent(p.cancelledPercent)})` },
        { label: 'Avg Duration', value: minutesLabel(p.avgVisitDurationMinutes) },
      ],
    },
    {
      heading: 'Top Service Types',
      rows: report.topServiceTypes.map((service) => ({
        label: service.type,
        value: `${service.count} visits`,
      })),
    },
    {
      heading: 'Cancellation Reasons',
      rows: report.cancellationReasons.map((reason) => ({
        label: reason.reason,
        value: `${reason.count} (${reason.percent}%)`,
      })),
    },
  ];
}
