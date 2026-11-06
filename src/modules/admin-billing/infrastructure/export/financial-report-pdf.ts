import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { FinancialReportResult } from '../../application/dto/financial-report.result';
import { money, pdfDate } from '../pdf/format';
import { AGING_LABEL, kpiRows, periodLabel } from './financial-report-format';

const LEFT = 50;
const COL2 = 330;
const COL3 = 460;

/** Render the Financial Report to a one page PDF. */
export function buildFinancialReportPdf(report: FinancialReportResult): {
  filename: string;
  pdf: Buffer;
} {
  const c = report.currency;
  const runs: PdfText[] = [];
  const line = (
    x: number,
    y: number,
    text: string,
    size = 10,
    font: PdfText['font'] = 'regular',
  ): void => {
    runs.push({ x, y, text, size, font });
  };

  line(LEFT, 800, 'FINANCIAL REPORT', 20, 'bold');
  line(LEFT, 780, periodLabel(report), 10);
  line(
    LEFT,
    766,
    `Branch: ${report.branch ?? 'All branches'}   Comparison: ${report.comparison}`,
    9,
  );

  let y = 736;
  for (const kpi of kpiRows(report)) {
    line(LEFT, y, kpi.label, 10, 'bold');
    line(COL2, y, money(kpi.amountMinor, c), 10, 'bold');
    line(LEFT, y - 12, kpi.note, 8);
    y -= 32;
  }

  y -= 6;
  line(LEFT, y, 'Revenue by Month', 11, 'bold');
  y -= 16;
  for (const point of report.monthlyRevenue) {
    line(LEFT, y, pdfDate(point.monthStart).replace(/^\d+ /, ''));
    line(COL2, y, money(point.revenueMinor, c));
    y -= 14;
  }

  y -= 10;
  line(LEFT, y, 'Collections by Method', 11, 'bold');
  y -= 16;
  for (const share of report.collectionsByMethod) {
    line(LEFT, y, share.method);
    line(COL2, y, money(share.amountMinor, c));
    line(COL3, y, `${share.sharePercent}%`);
    y -= 14;
  }

  y -= 10;
  line(LEFT, y, 'Aging Report', 11, 'bold');
  y -= 16;
  line(LEFT, y, 'Period', 9, 'bold');
  line(COL2, y, 'Amount', 9, 'bold');
  line(COL3, y, 'Share', 9, 'bold');
  y -= 14;
  for (const bucket of report.aging) {
    line(LEFT, y, `${AGING_LABEL[bucket.bucket]} (${bucket.invoiceCount})`);
    line(COL2, y, money(bucket.totalMinor, c));
    line(COL3, y, `${bucket.percent}%`);
    y -= 14;
  }

  return { filename: `financial-report-${report.from.slice(0, 10)}.pdf`, pdf: buildPdf(runs) };
}
