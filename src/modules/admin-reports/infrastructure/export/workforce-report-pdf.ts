import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { WorkforceReportResult } from '../../application/dto/workforce-report.result';
import { percent, periodLabel, rating, workforceSections } from './workforce-report-format';

const LEFT = 50;
const COL2 = 330;

/** Render the Workforce Report to a one page PDF (the Export PDF action). */
export function buildWorkforceReportPdf(report: WorkforceReportResult): {
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

  line(LEFT, 800, 'WORKFORCE REPORT', 20, 'bold');
  line(LEFT, 780, periodLabel(report), 10);

  let y = 752;
  for (const section of workforceSections(report)) {
    line(LEFT, y, section.heading, 12, 'bold');
    y -= 16;
    for (const row of section.rows) {
      line(LEFT, y, row.label, 10);
      line(COL2, y, row.value, 10, 'bold');
      y -= 14;
    }
    y -= 10;
  }

  line(LEFT, y, 'Top Caregivers', 12, 'bold');
  y -= 16;
  for (const caregiver of report.topCaregivers) {
    line(LEFT, y, `${caregiver.rank}. ${caregiver.name}`, 10);
    line(
      COL2,
      y,
      `${rating(caregiver.rating)}, ${caregiver.visitsCompleted} visits, ${percent(caregiver.onTimeRatePercent)} on time`,
      9,
    );
    y -= 14;
  }

  return { filename: `workforce-report-${report.from.slice(0, 10)}.pdf`, pdf: buildPdf(runs) };
}
