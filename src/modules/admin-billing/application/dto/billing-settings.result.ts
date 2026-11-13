import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';

export interface BillingInvoiceSettingsResult {
  defaultPaymentTermsDays: number;
  invoicePrefix: string;
  defaultCurrency: string;
  standardTaxRatePercent: number;
  autoNumbering: boolean;
  includeVatInPricing: boolean;
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

/** The issuing agency's profile, used as the invoice letterhead and payment info. */
export interface BillingCompanyProfileResult {
  companyName: string | null;
  companyAddress: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
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
  company: BillingCompanyProfileResult;
  paymentMethods: BillingPaymentMethodResult[];
  /** Which payment avenue is presented as the default, or null when none is. */
  defaultPaymentMethod: string | null;
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
      includeVatInPricing: p.includeVatInPricing,
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
    company: {
      companyName: p.companyName,
      companyAddress: p.companyAddress,
      bankName: p.bankName,
      bankAccountNumber: p.bankAccountNumber,
      bankAccountName: p.bankAccountName,
    },
    paymentMethods: paymentMethods.map(toPaymentMethodResult),
    defaultPaymentMethod: p.defaultPaymentMethod,
  };
}
