import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { ReportsOverviewResult } from '../../application/dto/reports-overview.result';
import { overviewSections, periodLabel } from './reports-overview-format';

const LEFT = 50;
const COL2 = 330;

/** Render the Reports Overview to a one page PDF (the Export PDF action). */
export function buildReportsOverviewPdf(report: ReportsOverviewResult): {
  filename: string;
  pdf: Buffer;
} {
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

  line(LEFT, 800, 'OPERATIONS REPORT', 20, 'bold');
  line(LEFT, 780, periodLabel(report), 10);
  line(LEFT, 766, `Market: ${report.currency}`, 9);

  let y = 736;
  for (const section of overviewSections(report)) {
    line(LEFT, y, section.heading, 12, 'bold');
    y -= 16;
    for (const row of section.rows) {
      line(LEFT, y, row.label, 10);
      line(COL2, y, row.value, 10, 'bold');
      y -= 14;
    }
    y -= 10;
  }

  return { filename: `operations-report-${report.from.slice(0, 10)}.pdf`, pdf: buildPdf(runs) };
}
