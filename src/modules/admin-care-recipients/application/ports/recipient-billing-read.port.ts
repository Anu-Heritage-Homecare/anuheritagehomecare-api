import { Currency } from '@shared/domain/currency.enum';
import { InvoiceStatus } from '@modules/recipient-billing/domain/invoice-status.enum';

export interface InvoiceRowView {
  id: string;
  sequence: number;
  issuedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  servicesLabel: string;
  currency: Currency;
  amountMinor: number;
  insuranceCoveredMinor: number;
  status: InvoiceStatus;
  dueDate: Date | null;
}

export interface InvoicePageView {
  rows: InvoiceRowView[];
  total: number;
}

export interface BillingSummaryView {
  currency: Currency | null;
  billedThisMonthMinor: number;
  billedLastMonthMinor: number;
  outstandingMinor: number;
  earliestDueDate: Date | null;
  lastPaymentMinor: number | null;
  lastPaymentAt: Date | null;
  overdueCount: number;
}

export interface ServiceBreakdownRowView {
  serviceName: string;
  amountMinor: number;
}

export interface PaymentRowView {
  amountMinor: number;
  currency: Currency;
  methodLabel: string | null;
  receivedAt: Date;
}

/**
 * Read model over the recipient billing tables for the admin Billing screen: the
 * paginated invoice list, the summary figures, the year to date service breakdown
 * and the payment history.
 */
export interface RecipientBillingReadModel {
  listInvoices(recipientId: string, page: number, pageSize: number): Promise<InvoicePageView>;
  summary(
    recipientId: string,
    monthStart: Date,
    lastMonthStart: Date,
    now: Date,
  ): Promise<BillingSummaryView>;
  serviceBreakdown(recipientId: string, yearStart: Date): Promise<ServiceBreakdownRowView[]>;
  paymentHistory(recipientId: string, limit: number): Promise<PaymentRowView[]>;
}

export const RECIPIENT_BILLING_READ_MODEL = Symbol('RECIPIENT_BILLING_READ_MODEL');
