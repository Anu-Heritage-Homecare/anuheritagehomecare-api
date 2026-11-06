import { buildXlsx, XlsxCell } from '@shared/infrastructure/xlsx/xlsx';
import { FinancialReportResult } from '../../application/dto/financial-report.result';
import { AGING_LABEL, kpiRows, periodLabel } from './financial-report-format';

/** Major units as a number so the spreadsheet can sum the column. */
function amount(minor: number): number {
  return Math.round(minor) / 100;
}

/** Render the Financial Report to a one sheet .xlsx workbook. */
export function buildFinancialReportXlsx(report: FinancialReportResult): {
  filename: string;
  xlsx: Buffer;
} {
  const rows: XlsxCell[][] = [
    ['Financial Report', periodLabel(report)],
    ['Branch', report.branch ?? 'All branches'],
    ['Comparison', report.comparison],
    ['Currency', report.currency],
    [],
    ['Metric', 'Amount', 'Note'],
    ...kpiRows(report).map((k): XlsxCell[] => [k.label, amount(k.amountMinor), k.note]),
    [],
    ['Revenue by Month', 'Amount'],
    ...report.monthlyRevenue.map((p): XlsxCell[] => [
      p.monthStart.slice(0, 10),
      amount(p.revenueMinor),
    ]),
    [],
    ['Collections by Method', 'Amount', 'Share %'],
    ...report.collectionsByMethod.map((s): XlsxCell[] => [
      s.method,
      amount(s.amountMinor),
      s.sharePercent,
    ]),
    [],
    ['Aging Period', 'Invoice Count', 'Amount', 'Share %'],
    ...report.aging.map((b): XlsxCell[] => [
      AGING_LABEL[b.bucket],
      b.invoiceCount,
      amount(b.totalMinor),
      b.percent,
    ]),
  ];

  return {
    filename: `financial-report-${report.from.slice(0, 10)}.xlsx`,
    xlsx: buildXlsx('Financial Report', rows),
  };
}
