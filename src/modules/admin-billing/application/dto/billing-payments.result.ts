import { PaymentListCounts, PaymentListStatus } from '../ports/billing-payments-read.port';

/** One row of the org wide Payments list. Money is minor units, date is an ISO string. */
export interface BillingPaymentRowResult {
  id: string;
  reference: string;
  invoiceNumber: string | null;
  billingAccountId: string | null;
  billingAccountName: string | null;
  amountMinor: number;
  /** Cumulative amount already refunded (0 when none). */
  refundedAmountMinor: number;
  /** Still refundable (amountMinor minus refunded); 0 for non refundable rows. */
  refundableRemainingMinor: number;
  currency: string;
  method: string | null;
  receivedAt: string;
  status: PaymentListStatus;
}

export interface BillingPaymentsListResult {
  payments: BillingPaymentRowResult[];
  tabs: PaymentListCounts;
  methods: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
