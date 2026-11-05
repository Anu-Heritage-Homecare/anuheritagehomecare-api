import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';

export interface BillingInvoiceSettingsResult {
  defaultPaymentTermsDays: number;
  invoicePrefix: string;
  defaultCurrency: string;
  standardTaxRatePercent: number;
  autoNumbering: boolean;
}

export interface BillingAutomationSettingsResult {
  autoSendInvoices: boolean;
  paymentReminders: boolean;
  reminderDaysBefore: number;
  overdueNotifications: boolean;
  overdueNoticeDaysAfter: number;
  autoReceipts: boolean;
}

export interface BillingNotificationSettingsResult {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface BillingPaymentMethodResult {
  method: string;
  enabled: boolean;
  description: string;
}

export interface BillingSettingsResult {
  invoice: BillingInvoiceSettingsResult;
  automation: BillingAutomationSettingsResult;
  notifications: BillingNotificationSettingsResult;
  paymentMethods: BillingPaymentMethodResult[];
}

/** The stored tax rate is in basis points; the screen works in whole percent. */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

export function toPaymentMethodResult(
  method: BillingPaymentMethodSetting,
): BillingPaymentMethodResult {
  return { method: method.method, enabled: method.enabled, description: method.description };
}

export function toBillingSettingsResult(
  settings: BillingSettings,
  paymentMethods: BillingPaymentMethodSetting[],
): BillingSettingsResult {
  const p = settings.snapshot();
  return {
    invoice: {
      defaultPaymentTermsDays: p.defaultPaymentTermsDays,
      invoicePrefix: p.invoicePrefix,
      defaultCurrency: p.defaultCurrency,
      standardTaxRatePercent: basisPointsToPercent(p.standardTaxRateBasisPoints),
      autoNumbering: p.autoNumbering,
    },
    automation: {
      autoSendInvoices: p.autoSendInvoices,
      paymentReminders: p.paymentReminders,
      reminderDaysBefore: p.reminderDaysBefore,
      overdueNotifications: p.overdueNotifications,
      overdueNoticeDaysAfter: p.overdueNoticeDaysAfter,
      autoReceipts: p.autoReceipts,
    },
    notifications: {
      email: p.emailNotifications,
      sms: p.smsNotifications,
      inApp: p.inAppNotifications,
    },
    paymentMethods: paymentMethods.map(toPaymentMethodResult),
  };
}
