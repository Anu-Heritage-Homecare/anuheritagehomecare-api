/** A recorded payment is always complete; the model stores no payment status. */
export type PaymentDisplayStatus = 'COMPLETED';

/** One payment row on the Payments tab. Money is minor units, date is an ISO string. */
export interface BillingAccountPaymentRowResult {
  id: string;
  reference: string;
  /** The INV-<year>-<sequence> the payment settled, null when unlinked. */
  invoiceNumber: string | null;
  amountMinor: number;
  currency: string;
  method: string | null;
  receivedAt: string;
  status: PaymentDisplayStatus;
  /** Offline reconciliation details captured on the Record Payment drawer. */
  referenceNumber: string | null;
  bankName: string | null;
  notes: string | null;
}

export interface BillingAccountPaymentsResult {
  payments: BillingAccountPaymentRowResult[];
  total: number;
}
