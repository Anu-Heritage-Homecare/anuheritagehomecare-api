import { BillingTax } from './billing-tax.entity';

/** Persistence port for configurable billing taxes. */
export interface BillingTaxRepository {
  list(): Promise<BillingTax[]>;
  findById(id: string): Promise<BillingTax | null>;
  save(tax: BillingTax): Promise<void>;
  delete(id: string): Promise<void>;
}

export const BILLING_TAX_REPOSITORY = Symbol('BILLING_TAX_REPOSITORY');
