import { Currency } from '@shared/domain/currency.enum';

/** The invoice financials needed to record a payment and decide if it is now settled. */
export interface InvoicePaymentContext {
  careRecipientId: string;
  currency: Currency;
  /** The patient due (invoice total net of insurance), in minor units. */
  patientDueMinor: number;
  /** What has already been paid against the invoice, in minor units. */
  paidMinor: number;
  alreadyPaid: boolean;
}

export interface NewInvoicePayment {
  id: string;
  invoiceId: string;
  careRecipientId: string;
  amountMinor: number;
  currency: Currency;
  methodLabel: string | null;
  receivedAt: Date;
}

/** What an online payment for an invoice charges, and who it bills. */
export interface InvoicePayable {
  ownerId: string;
  ownerEmail: string;
  currency: Currency;
  /** The outstanding balance to charge, in minor units. */
  balanceMinor: number;
  alreadyPaid: boolean;
}

/** Persistence port for recording a payment against an invoice from the back office. */
export interface InvoicePaymentWriteRepository {
  /** The context to price and settle a payment, or null when the invoice is unknown. */
  loadForPayment(invoiceId: string): Promise<InvoicePaymentContext | null>;
  /** The payable detail for an online charge (owner, email, balance), or null. */
  loadPayable(invoiceId: string): Promise<InvoicePayable | null>;
  record(payment: NewInvoicePayment): Promise<void>;
  /** Mark the invoice fully paid. */
  markPaid(invoiceId: string): Promise<void>;
}

export const INVOICE_PAYMENT_WRITE_REPOSITORY = Symbol('INVOICE_PAYMENT_WRITE_REPOSITORY');
