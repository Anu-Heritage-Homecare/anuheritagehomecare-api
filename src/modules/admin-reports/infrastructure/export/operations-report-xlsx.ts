import { buildXlsx, XlsxCell } from '@shared/infrastructure/xlsx/xlsx';
import { OperationsReportResult } from '../../application/dto/operations-report.result';
import { operationsSections, percent, periodLabel } from './operations-report-format';

/** Render the Operations Report to a one sheet .xlsx workbook (the Export Excel action). */
export function buildOperationsReportXlsx(report: OperationsReportResult): {
  filename: string;
  xlsx: Buffer;
} {
  const rows: XlsxCell[][] = [['Operations Report', periodLabel(report)], []];
  for (const section of operationsSections(report)) {
    rows.push([section.heading]);
    for (const row of section.rows) {
      rows.push([row.label, row.value]);
    }
    rows.push([]);
  }
  rows.push(['Performance by Location']);
  rows.push([
    'Location',
    'Total Visits',
    'Completion',
    'Avg Duration (min)',
    'Satisfaction',
    'Trend',
  ]);
  for (const location of report.locationPerformance) {
    rows.push([
      location.location,
      location.totalVisits,
      percent(location.completionPercent),
      location.avgVisitDurationMinutes ?? 'n/a',
      location.satisfactionAvg ?? 'n/a',
      location.trend,
    ]);
  }

  return {
    filename: `operations-report-${report.from.slice(0, 10)}.xlsx`,
    xlsx: buildXlsx('Operations Report', rows),
  };
}
