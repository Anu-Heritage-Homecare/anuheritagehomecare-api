/**
 * A minimal RFC 4180 CSV writer, so it needs no dependency. Every field is quoted
 * and embedded quotes are doubled, which is always valid and sidesteps comma,
 * quote and newline escaping entirely. Rows are joined with CRLF.
 */

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Build a CSV document (UTF-8) from a header row and data rows. */
export function toCsv(headers: string[], rows: string[][]): Buffer {
  const lines = [headers, ...rows].map((row) => row.map(quote).join(','));
  return Buffer.from(lines.join('\r\n'), 'utf8');
}
