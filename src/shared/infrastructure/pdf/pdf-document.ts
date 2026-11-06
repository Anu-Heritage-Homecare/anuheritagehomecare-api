/**
 * A minimal single page PDF writer using the two standard Type1 fonts (Helvetica
 * and Helvetica-Bold), so it needs no dependency and embeds no font. Text is
 * positioned absolutely; the origin is the bottom left corner and y grows upward.
 * Enough to render a plain business document (an invoice); not a general layout
 * engine. The 14 standard fonts use WinAnsi encoding, so characters outside
 * Latin-1 are replaced with '?'.
 */

export type PdfFont = 'regular' | 'bold';

export interface PdfText {
  x: number;
  y: number;
  text: string;
  size: number;
  font: PdfFont;
}

/** A4 in PostScript points. */
export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;

/** Escape a string for a PDF literal and drop characters WinAnsi cannot encode. */
function escapePdfText(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0x3f;
    const safe = code > 0xff ? '?' : char;
    if (safe === '\\' || safe === '(' || safe === ')') {
      out += `\\${safe}`;
    } else {
      out += safe;
    }
  }
  return out;
}

/** Build a one page PDF from absolutely positioned text runs. */
export function buildPdf(runs: PdfText[]): Buffer {
  const content = runs
    .map(
      (run) =>
        `BT /${run.font === 'bold' ? 'F2' : 'F1'} ${run.size} Tf ` +
        `${run.x} ${run.y} Td (${escapePdfText(run.text)}) Tj ET`,
    )
    .join('\n');
  const contentLength = Buffer.byteLength(content, 'latin1');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}
