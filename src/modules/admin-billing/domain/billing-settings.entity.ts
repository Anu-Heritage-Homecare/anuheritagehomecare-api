import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingPaymentMethodKind } from './billing-payment-method-kind.enum';

export interface BillingSettingsProps {
  defaultPaymentTermsDays: number;
  invoicePrefix: string;
  defaultCurrency: Currency;
  standardTaxRateBasisPoints: number;
  /** Whether listed prices already include VAT (the Include VAT in Pricing toggle). */
  includeVatInPricing: boolean;
  /** Which payment avenue is presented as the default, or null when none is. */
  defaultPaymentMethod: BillingPaymentMethodKind | null;
  autoNumbering: boolean;
  autoSendInvoices: boolean;
  paymentReminders: boolean;
  reminderDaysBefore: number;
  overdueNotifications: boolean;
  overdueNoticeDaysAfter: number;
  autoReceipts: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  /** The issuing agency's profile, printed as the invoice letterhead and payment info. */
  companyName: string | null;
  companyAddress: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
}

/** Every field a caller may change; omitted fields keep their current value. */
export type BillingSettingsPatch = Partial<BillingSettingsProps>;

const MAX_PREFIX = 10;
const MAX_TERM_DAYS = 365;
const MAX_OFFSET_DAYS = 90;
const MAX_TAX_BASIS_POINTS = 10_000; // 100%

/**
 * The organisation wide billing preferences (a singleton). Money rates are integers:
 * the tax rate is in basis points (750 = 7.5%). Every mutation goes through `apply`,
 * which revalidates the whole set so the record is never left invalid.
 */
export class BillingSettings {
  private state: BillingSettingsProps;

  private constructor(state: BillingSettingsProps) {
    this.state = state;
  }

  /** The out of the box defaults, used before anything has been saved. */
  static createDefault(): BillingSettings {
    return new BillingSettings({
      defaultPaymentTermsDays: 30,
      invoicePrefix: 'INV-',
      defaultCurrency: Currency.NigerianNaira,
      standardTaxRateBasisPoints: 750,
      includeVatInPricing: true,
      defaultPaymentMethod: null,
      autoNumbering: true,
      autoSendInvoices: true,
      paymentReminders: true,
      reminderDaysBefore: 7,
      overdueNotifications: true,
      overdueNoticeDaysAfter: 1,
      autoReceipts: true,
      emailNotifications: true,
      smsNotifications: true,
      inAppNotifications: true,
      companyName: null,
      companyAddress: null,
      bankName: null,
      bankAccountNumber: null,
      bankAccountName: null,
    });
  }

  static fromPersistence(state: BillingSettingsProps): BillingSettings {
    const settings = new BillingSettings(state);
    settings.validate();
    return settings;
  }

  /** Apply a partial change (undefined fields are ignored) and revalidate. */
  apply(patch: BillingSettingsPatch): this {
    const next: BillingSettingsProps = { ...this.state };
    for (const key of Object.keys(patch) as (keyof BillingSettingsProps)[]) {
      const value = patch[key];
      if (value !== undefined) {
        next[key] = value as never;
      }
    }
    if (patch.invoicePrefix !== undefined) {
      next.invoicePrefix = patch.invoicePrefix.trim();
    }
    // Trim the issuer text fields; an empty value clears them back to null.
    for (const key of [
      'companyName',
      'companyAddress',
      'bankName',
      'bankAccountNumber',
      'bankAccountName',
    ] as const) {
      if (patch[key] !== undefined) {
        const trimmed = (patch[key] ?? '').trim();
        next[key] = trimmed.length === 0 ? null : trimmed;
      }
    }
    this.state = next;
    this.validate();
    return this;
  }

  /** A read only snapshot of the current values. */
  snapshot(): Readonly<BillingSettingsProps> {
    return this.state;
  }

  private validate(): void {
    const p = this.state;
    if (p.invoicePrefix.length === 0 || p.invoicePrefix.length > MAX_PREFIX) {
      throw new ValidationException(`The invoice prefix must be 1 to ${MAX_PREFIX} characters`);
    }
    requireIntInRange(p.defaultPaymentTermsDays, 1, MAX_TERM_DAYS, 'default payment terms (days)');
    requireIntInRange(p.standardTaxRateBasisPoints, 0, MAX_TAX_BASIS_POINTS, 'standard tax rate');
    requireIntInRange(p.reminderDaysBefore, 0, MAX_OFFSET_DAYS, 'payment reminder lead (days)');
    requireIntInRange(p.overdueNoticeDaysAfter, 0, MAX_OFFSET_DAYS, 'overdue notice delay (days)');
  }
}

function requireIntInRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationException(`The ${label} must be a whole number between ${min} and ${max}`);
  }
}
