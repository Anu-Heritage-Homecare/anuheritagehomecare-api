import { Invoice } from '../../domain/invoice.entity';
import { BillingPaymentView } from '../ports/billing-directories.port';
import { toIsoDate } from '../billing-date.util';

/** The family billing dashboard: the active plan card plus the billing summary. */
export interface BillingDashboardResult {
  plan: {
    planName: string;
    planType: string;
    currency: string;
    monthlyPriceMinor: number;
    nextPaymentDate: string;
    autoPay: boolean;
  } | null;
  summary: {
    currency: string;
    paidThisMonthMinor: number;
    upcomingPaymentMinor: number;
    upcomingPaymentDate: string | null;
  };
}

/** One invoice in the owner's billing history. */
export interface InvoiceSummaryResult {
  id: string;
  number: string;
  currency: string;
  amountMinor: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}

/** The full detail of one invoice. */
export interface InvoiceDetailResult extends InvoiceSummaryResult {
  careRecipientId: string;
  subscriptionId: string;
  issuedAt: string;
  paidAt: string | null;
}

/** A receipt, derived from a settled payment. */
export interface ReceiptResult {
  id: string;
  currency: string;
  amountMinor: number;
  provider: string;
  reference: string;
  forType: string;
  paidAt: string;
}

export function toInvoiceSummary(invoice: Invoice): InvoiceSummaryResult {
  return {
    id: invoice.id,
    number: invoice.number,
    currency: String(invoice.currency),
    amountMinor: invoice.amountMinor,
    status: String(invoice.status),
    periodStart: toIsoDate(invoice.periodStart),
    periodEnd: toIsoDate(invoice.periodEnd),
    dueDate: toIsoDate(invoice.dueDate),
  };
}

export function toInvoiceDetail(invoice: Invoice): InvoiceDetailResult {
  return {
    ...toInvoiceSummary(invoice),
    careRecipientId: invoice.careRecipientId,
    subscriptionId: invoice.subscriptionId,
    issuedAt: invoice.issuedAt.toISOString(),
    paidAt: invoice.paidAt === null ? null : invoice.paidAt.toISOString(),
  };
}

export function toReceipt(payment: BillingPaymentView): ReceiptResult {
  return {
    id: payment.id,
    currency: payment.currency,
    amountMinor: payment.amountMinor,
    provider: payment.provider,
    reference: payment.reference,
    forType: payment.payableType,
    paidAt: payment.createdAt.toISOString(),
  };
}
