export type PaymentDetailStatus = 'COMPLETED' | 'REFUNDED';

/** The linked invoice card on the Payment Details drawer. */
export interface PaymentLinkedInvoiceResult {
  number: string;
  accountName: string | null;
  amountMinor: number;
  status: string;
}

/** One event on the Payment History timeline. */
export interface PaymentHistoryEventResult {
  type: 'INITIATED' | 'CONFIRMED' | 'RECEIPT_GENERATED' | 'REFUNDED';
  title: string;
  at: string;
  /** The admin name for an ADMIN event, or the system/method label otherwise. */
  performedBy: string | null;
  detail: string | null;
}

/** The Payment Details drawer: the card, linked invoice, history and internal notes. */
export interface PaymentDetailResult {
  id: string;
  reference: string;
  amountMinor: number;
  currency: string;
  status: PaymentDetailStatus;
  method: string | null;
  receivedAt: string;
  referenceNumber: string | null;
  bankName: string | null;
  notes: string | null;
  linkedInvoice: PaymentLinkedInvoiceResult | null;
  history: PaymentHistoryEventResult[];
}
