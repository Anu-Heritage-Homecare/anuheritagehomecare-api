const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format integer minor units as "NGN 250,000.00". The symbol is avoided (WinAnsi). */
export function money(minor: number, currency: string): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const grouped = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${currency} ${grouped}.${cents}`;
}

/** Format an ISO date as "15 Aug 2026"; empty for a null or unparseable value. */
export function pdfDate(iso: string | null): string {
  if (iso === null) {
    return '';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return `${parsed.getUTCDate()} ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}
