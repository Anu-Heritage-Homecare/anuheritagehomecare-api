import { BillingTax } from '../../domain/billing-tax.entity';
import { BillingPaymentTerm } from '../../domain/billing-payment-term.entity';
import { TaxScope } from '../../domain/tax-scope.enum';
import { BillingSettingsResult } from './billing-settings.result';

export interface BillingTaxResult {
  id: string;
  name: string;
  ratePercent: number;
  scope: TaxScope;
  isActive: boolean;
  description: string | null;
}

export interface BillingPaymentTermResult {
  id: string;
  name: string;
  netDays: number | null;
  isDefault: boolean;
  isActive: boolean;
  isCustom: boolean;
  description: string | null;
}

/** The whole Billing & Payments settings screen. */
export interface BillingAndPaymentsScreenResult extends BillingSettingsResult {
  taxes: BillingTaxResult[];
  paymentTerms: BillingPaymentTermResult[];
  /** The number the next issued invoice would take, e.g. "2026-0458" (display only). */
  nextInvoiceNumber: string;
}

export function toTaxResult(tax: BillingTax): BillingTaxResult {
  return {
    id: tax.id,
    name: tax.name,
    ratePercent: tax.rateBasisPoints / 100,
    scope: tax.scope,
    isActive: tax.isActive,
    description: tax.description,
  };
}

export function toPaymentTermResult(term: BillingPaymentTerm): BillingPaymentTermResult {
  return {
    id: term.id,
    name: term.name,
    netDays: term.netDays,
    isDefault: term.isDefault,
    isActive: term.isActive,
    isCustom: term.isCustom,
    description: term.description,
  };
}
