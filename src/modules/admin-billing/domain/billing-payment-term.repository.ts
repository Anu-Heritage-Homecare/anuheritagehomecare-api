import { BillingPaymentTerm } from './billing-payment-term.entity';

/** Persistence port for configurable payment terms. */
export interface BillingPaymentTermRepository {
  list(): Promise<BillingPaymentTerm[]>;
  findById(id: string): Promise<BillingPaymentTerm | null>;
  save(term: BillingPaymentTerm): Promise<void>;
  /** Save several terms in one unit (used to move the default flag atomically). */
  saveMany(terms: BillingPaymentTerm[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export const BILLING_PAYMENT_TERM_REPOSITORY = Symbol('BILLING_PAYMENT_TERM_REPOSITORY');
