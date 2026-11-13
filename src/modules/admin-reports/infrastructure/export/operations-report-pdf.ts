import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { OperationsReportResult } from '../../application/dto/operations-report.result';
import { minutesLabel, operationsSections, percent, periodLabel } from './operations-report-format';

const LEFT = 50;
const COL2 = 330;

/** Render the Operations Report to a one page PDF (the Export PDF action). */
export function buildOperationsReportPdf(report: OperationsReportResult): {
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

  let y = 752;
  for (const section of operationsSections(report)) {
    line(LEFT, y, section.heading, 12, 'bold');
    y -= 16;
    for (const row of section.rows) {
      line(LEFT, y, row.label, 10);
      line(COL2, y, row.value, 10, 'bold');
      y -= 14;
    }
    y -= 10;
  }

  line(LEFT, y, 'Performance by Location', 12, 'bold');
  y -= 16;
  for (const location of report.locationPerformance) {
    line(LEFT, y, location.location, 10);
    line(
      COL2,
      y,
      `${location.totalVisits} visits, ${percent(location.completionPercent)}, ${minutesLabel(location.avgVisitDurationMinutes)}`,
      9,
    );
    y -= 14;
  }

  return { filename: `operations-report-${report.from.slice(0, 10)}.pdf`, pdf: buildPdf(runs) };
}
