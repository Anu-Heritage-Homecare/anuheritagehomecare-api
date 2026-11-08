import { Currency } from '@shared/domain/currency.enum';

/** The channels a payment reminder can be sent through (the Send via choice). */
export type ReminderChannel = 'EMAIL' | 'SMS';

export interface ReminderMessage {
  subject: string;
  body: string;
}

/**
 * Compose the payment reminder subject and body from the invoice facts. The office
 * preview and the dispatched email share this one template, so what the admin sees is
 * exactly what the client receives.
 */
export function buildReminderMessage(params: {
  invoiceNumber: string;
  amountDueMinor: number;
  currency: Currency;
  daysOverdue: number;
}): ReminderMessage {
  const amount = formatMoney(params.amountDueMinor, params.currency);
  const dueClause =
    params.daysOverdue > 0
      ? `was due ${params.daysOverdue} day${params.daysOverdue === 1 ? '' : 's'} ago`
      : 'is now due';
  return {
    subject: `Payment Reminder: Invoice ${params.invoiceNumber}`,
    body:
      `Dear Customer, This is a friendly reminder that invoice ${params.invoiceNumber} ` +
      `for ${amount} ${dueClause}. Please process the payment as soon as possible. ` +
      `Thank you for your continued support.`,
  };
}

/** Whole days an invoice is past its due date, floored at zero (0 when not yet due). */
export function daysOverdue(dueDate: Date | null, now: Date): number {
  if (dueDate === null) {
    return 0;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / dayMs));
}

/** Human readable amount from integer minor units, with the market currency symbol. */
export function formatMoney(amountMinor: number, currency: Currency): string {
  const locale = currency === Currency.NigerianNaira ? 'en-NG' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor / 100);
}
