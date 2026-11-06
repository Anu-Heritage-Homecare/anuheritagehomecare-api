import { toCsv } from '@shared/infrastructure/csv/csv';
import { BillingAccountPaymentsResult } from '../../application/dto/billing-account-payments.result';

/** Format integer minor units as a plain decimal for a spreadsheet, e.g. "250000.00". */
function amount(minor: number): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Render the account's payment history as a downloadable CSV. */
export function paymentsToCsv(result: BillingAccountPaymentsResult): Buffer {
  return toCsv(
    ['Payment Ref', 'Invoice', 'Amount', 'Currency', 'Method', 'Date', 'Status'],
    result.payments.map((payment) => [
      payment.reference,
      payment.invoiceNumber ?? '',
      amount(payment.amountMinor),
      payment.currency,
      payment.method ?? '',
      payment.receivedAt.slice(0, 10),
      payment.status,
    ]),
  );
}
