import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { BillingInvoiceDetailResult } from '../../application/dto/billing-invoice-detail.result';

const LEFT = 50;
const COL_QTY = 320;
const COL_RATE = 380;
const COL_AMOUNT = 470;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format integer minor units as "NGN 250,000.00". The symbol is avoided (WinAnsi). */
function money(minor: number, currency: string): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const grouped = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${currency} ${grouped}.${cents}`;
}

/** Format an ISO date as "15 Aug 2026"; empty for a null or unparseable value. */
function date(iso: string | null): string {
  if (iso === null) {
    return '';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return `${parsed.getUTCDate()} ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/**
 * Render a billing invoice to a downloadable PDF. One page; a long line item list
 * would overflow the page bottom.
 * shortcut: single page, no pagination; add page breaks if invoices routinely carry
 * more than ~25 line items.
 */
export function buildInvoicePdf(invoice: BillingInvoiceDetailResult): {
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

  const c = invoice.currency;
  line(LEFT, 800, 'INVOICE', 22, 'bold');
  line(LEFT, 778, invoice.number, 11);
  line(LEFT, 764, `Status: ${invoice.status.replace(/_/g, ' ')}`);

  line(LEFT, 736, 'Billed to', 9, 'bold');
  line(LEFT, 722, invoice.billingAccountName ?? invoice.careRecipientName);
  line(LEFT, 708, `Care recipient: ${invoice.careRecipientName}`);

  line(360, 736, 'Invoice date', 9, 'bold');
  line(360, 722, date(invoice.invoiceDate));
  line(360, 708, `Due: ${date(invoice.dueDate)}`);
  if (invoice.paymentTerms !== null) {
    line(360, 694, `Terms: ${invoice.paymentTerms}`);
  }
  line(
    360,
    680,
    `Service: ${date(invoice.servicePeriodStart)} - ${date(invoice.servicePeriodEnd)}`,
  );

  // Line item table.
  let y = 640;
  line(LEFT, y, 'Service', 9, 'bold');
  line(COL_QTY, y, 'Qty', 9, 'bold');
  line(COL_RATE, y, 'Rate', 9, 'bold');
  line(COL_AMOUNT, y, 'Amount', 9, 'bold');
  y -= 6;
  line(LEFT, y, '_'.repeat(85), 8);
  y -= 16;
  for (const item of invoice.lineItems) {
    line(LEFT, y, item.serviceName);
    line(COL_QTY, y, item.quantity === null ? '-' : String(item.quantity));
    line(COL_RATE, y, item.rateMinor === null ? '-' : money(item.rateMinor, c));
    line(COL_AMOUNT, y, money(item.amountMinor, c));
    y -= 16;
  }

  // Totals.
  y -= 10;
  line(COL_RATE, y, 'Total', 10, 'bold');
  line(COL_AMOUNT, y, money(invoice.totalAmountMinor, c), 10, 'bold');
  y -= 16;
  if (invoice.insuranceCoveredMinor > 0) {
    line(COL_RATE, y, 'Insurance');
    line(COL_AMOUNT, y, `-${money(invoice.insuranceCoveredMinor, c)}`);
    y -= 16;
  }
  line(COL_RATE, y, 'Paid');
  line(COL_AMOUNT, y, money(invoice.amountPaidMinor, c));
  y -= 16;
  line(COL_RATE, y, 'Balance due', 11, 'bold');
  line(COL_AMOUNT, y, money(invoice.balanceDueMinor, c), 11, 'bold');

  return { filename: `${invoice.number}.pdf`, pdf: buildPdf(runs) };
}
