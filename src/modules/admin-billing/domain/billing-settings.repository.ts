import { BillingPaymentMethodKind } from './billing-payment-method-kind.enum';
import { BillingPaymentMethodSetting } from './billing-payment-method.entity';
import { BillingSettings } from './billing-settings.entity';

/**
 * Persistence port for the billing settings singleton and its payment method avenues.
 * Declared in the domain; infrastructure supplies the Prisma adapter.
 */
export interface BillingSettingsRepository {
  /** The saved settings, or null when none have been saved yet. */
  load(): Promise<BillingSettings | null>;
  /** Upsert the settings singleton. */
  save(settings: BillingSettings): Promise<void>;
  /** The saved payment method rows (may be a subset of the known avenues). */
  loadPaymentMethods(): Promise<BillingPaymentMethodSetting[]>;
  /** The one saved payment method row, or null when it has never been saved. */
  loadPaymentMethod(method: BillingPaymentMethodKind): Promise<BillingPaymentMethodSetting | null>;
  /** Upsert one payment method avenue. */
  savePaymentMethod(method: BillingPaymentMethodSetting): Promise<void>;
}

export const BILLING_SETTINGS_REPOSITORY = Symbol('BILLING_SETTINGS_REPOSITORY');
