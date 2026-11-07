import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { BillingInvoiceDetailResult } from '../../application/dto/billing-invoice-detail.result';
import { money, pdfDate as date } from './format';

const LEFT = 50;
const COL_QTY = 320;
const COL_RATE = 380;
const COL_AMOUNT = 470;

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
  const issuer = invoice.issuer;

  // Issuer letterhead (left) and the INVOICE heading (right).
  if (issuer.companyName !== null) {
    line(LEFT, 800, issuer.companyName, 14, 'bold');
  }
  if (issuer.companyAddress !== null) {
    line(LEFT, 786, issuer.companyAddress, 8);
  }
  line(420, 800, 'INVOICE', 20, 'bold');
  line(420, 782, invoice.number, 10);
  line(420, 770, `Status: ${invoice.status.replace(/_/g, ' ')}`, 8);

  line(LEFT, 736, 'Billed to', 9, 'bold');
  line(LEFT, 722, invoice.billingAccountName ?? invoice.careRecipientName);
  if (invoice.billingAddress !== null) {
    line(LEFT, 708, invoice.billingAddress, 8);
  }
  line(LEFT, 696, `Care recipient: ${invoice.careRecipientName}`, 8);

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

  // Totals: subtotal, discounts, VAT, then the final figures.
  y -= 10;
  line(COL_RATE, y, 'Subtotal');
  line(COL_AMOUNT, y, money(invoice.subtotalMinor, c));
  y -= 16;
  if (invoice.discountTotalMinor > 0) {
    line(COL_RATE, y, 'Discounts');
    line(COL_AMOUNT, y, `-${money(invoice.discountTotalMinor, c)}`);
    y -= 16;
  }
  line(COL_RATE, y, `VAT (${invoice.taxRatePercent}%)`);
  line(COL_AMOUNT, y, money(invoice.taxMinor, c));
  y -= 16;
  if (invoice.insuranceCoveredMinor > 0) {
    line(COL_RATE, y, 'Insurance');
    line(COL_AMOUNT, y, `-${money(invoice.insuranceCoveredMinor, c)}`);
    y -= 16;
  }
  line(COL_RATE, y, 'Total Due', 11, 'bold');
  line(COL_AMOUNT, y, money(invoice.totalAmountMinor, c), 11, 'bold');
  y -= 16;
  line(COL_RATE, y, 'Paid');
  line(COL_AMOUNT, y, money(invoice.amountPaidMinor, c));
  y -= 16;
  line(COL_RATE, y, 'Balance due', 11, 'bold');
  line(COL_AMOUNT, y, money(invoice.balanceDueMinor, c), 11, 'bold');

  // Payment info footer, when the agency's bank details are set.
  if (issuer.bankName !== null || issuer.bankAccountNumber !== null) {
    line(LEFT, 90, 'Payment info', 9, 'bold');
    line(
      LEFT,
      76,
      [issuer.bankName, issuer.bankAccountNumber].filter((v) => v !== null).join(' • '),
      9,
    );
    if (issuer.bankAccountName !== null) {
      line(LEFT, 64, issuer.bankAccountName, 9);
    }
  }

  return { filename: `${invoice.number}.pdf`, pdf: buildPdf(runs) };
}
