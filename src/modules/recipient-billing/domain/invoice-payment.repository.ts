import { InvoicePayment } from './invoice-payment.entity';

/** Persistence port for invoice payments (append only from the domain). */
export interface InvoicePaymentRepository {
  add(payment: InvoicePayment): Promise<void>;
}

export const INVOICE_PAYMENT_REPOSITORY = Symbol('INVOICE_PAYMENT_REPOSITORY');
