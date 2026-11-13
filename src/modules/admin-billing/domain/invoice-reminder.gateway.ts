import { Currency } from '@shared/domain/currency.enum';

/** What the Send Payment Reminder modal needs to compose and address the reminder. */
export interface InvoiceReminderContext {
  invoiceId: string;
  /** The display reference (INV-<year>-<sequence>). */
  invoiceNumber: string;
  currency: Currency;
  /** The outstanding balance, net of insurance and payments, in minor units. */
  amountDueMinor: number;
  dueDate: Date | null;
  /** The billing client's email (the family owner), null when none is on file. */
  clientEmail: string | null;
}

/** Read port for the invoice facts a payment reminder is built from. */
export interface InvoiceReminderGateway {
  loadReminderContext(invoiceId: string): Promise<InvoiceReminderContext | null>;
}

export const INVOICE_REMINDER_GATEWAY = Symbol('INVOICE_REMINDER_GATEWAY');
