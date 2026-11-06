import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { BillingAccountPaymentRowResult } from '../../application/dto/billing-account-payments.result';
import { money, pdfDate } from './format';

const LEFT = 50;
const VALUE = 200;

/** Render a single payment as a downloadable PDF receipt. */
export function buildReceiptPdf(input: {
  accountName: string;
  payment: BillingAccountPaymentRowResult;
}): { filename: string; pdf: Buffer } {
  const { accountName, payment } = input;
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

  line(LEFT, 800, 'PAYMENT RECEIPT', 22, 'bold');
  line(LEFT, 778, payment.reference, 11);

  const field = (y: number, label: string, value: string): void => {
    line(LEFT, y, label, 9, 'bold');
    line(VALUE, y, value);
  };

  field(740, 'Account', accountName);
  field(722, 'Date', pdfDate(payment.receivedAt));
  field(704, 'Method', payment.method ?? '-');
  field(686, 'Invoice', payment.invoiceNumber ?? '-');
  field(668, 'Status', payment.status);

  // Offline reconciliation details, shown only when captured.
  let y = 650;
  if (payment.referenceNumber !== null) {
    field(y, 'Reference', payment.referenceNumber);
    y -= 18;
  }
  if (payment.bankName !== null) {
    field(y, 'Bank', payment.bankName);
    y -= 18;
  }
  if (payment.notes !== null) {
    field(y, 'Notes', payment.notes);
    y -= 18;
  }

  line(LEFT, y - 12, 'Amount paid', 10, 'bold');
  line(VALUE, y - 14, money(payment.amountMinor, payment.currency), 18, 'bold');

  return { filename: `${payment.reference}.pdf`, pdf: buildPdf(runs) };
}
