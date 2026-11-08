import { buildXlsx, XlsxCell } from '@shared/infrastructure/xlsx/xlsx';
import { ReportsOverviewResult } from '../../application/dto/reports-overview.result';
import { overviewSections, periodLabel } from './reports-overview-format';

/** Render the Reports Overview to a one sheet .xlsx workbook (the Export Excel action). */
export function buildReportsOverviewXlsx(report: ReportsOverviewResult): {
  filename: string;
  xlsx: Buffer;
} {
  const rows: XlsxCell[][] = [
    ['Operations Report', periodLabel(report)],
    ['Market', report.currency],
    [],
  ];
  for (const section of overviewSections(report)) {
    rows.push([section.heading]);
    for (const row of section.rows) {
      rows.push([row.label, row.value]);
    }
    rows.push([]);
  }
  rows.push(['Revenue by Month', 'Amount (minor units)']);
  for (const point of report.revenueOverview.monthly) {
    rows.push([point.monthStart.slice(0, 10), point.revenueMinor]);
  }

  return {
    filename: `operations-report-${report.from.slice(0, 10)}.xlsx`,
    xlsx: buildXlsx('Operations Report', rows),
  };
}
