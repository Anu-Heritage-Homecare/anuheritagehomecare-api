import { PayableType } from '@modules/payments/domain/payable-type.enum';
import { Invoice } from '../domain/invoice.entity';
import { InvoiceStatus } from '../domain/invoice-status.enum';
import { BillingPaymentView } from './ports/billing-directories.port';

/**
 * Reflect an invoice as paid when a settling charge for it exists. A payment for
 * an invoice carries its id as the payable id, so the match is exact. Read side
 * only: the invoice is not persisted, so payments never has to write to billing.
 */
export function reflectInvoicePayment(invoice: Invoice, payments: BillingPaymentView[]): void {
  if (invoice.status === InvoiceStatus.Paid) {
    return;
  }
  const settled = payments.find(
    (payment) =>
      payment.succeeded &&
      payment.payableType === String(PayableType.Invoice) &&
      payment.payableId === invoice.id,
  );
  if (settled !== undefined) {
    invoice.markPaid(settled.createdAt);
  }
}
