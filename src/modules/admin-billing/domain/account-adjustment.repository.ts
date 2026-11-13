import { Currency } from '@shared/domain/currency.enum';
import { AccountAdjustment } from './account-adjustment.entity';

/** An invoice that a credit can be applied to, with its remaining outstanding balance. */
export interface CreditableInvoice {
  careRecipientId: string;
  currency: Currency;
  /** Patient due net of what has been paid or already credited, in minor units. */
  outstandingMinor: number;
}

/**
 * Persistence port for the AccountAdjustment aggregate. Declared in the domain;
 * infrastructure supplies the Prisma adapter.
 */
export interface AccountAdjustmentRepository {
  /** Persist a new adjustment and return the sequence the database assigned it. */
  save(adjustment: AccountAdjustment): Promise<number>;
  /** Persist a change to an existing adjustment (for example an approval). */
  update(adjustment: AccountAdjustment): Promise<void>;
  /** Load one adjustment for a transition, or null when it does not exist. */
  findById(id: string): Promise<AccountAdjustment | null>;
  /** Whether the target billing account exists, so an adjustment is never orphaned. */
  billingAccountExists(billingAccountId: string): Promise<boolean>;
  /**
   * The invoice for the Apply Credit modal, scoped to the billing account, with its
   * outstanding balance; null when the invoice is unknown or not on that account.
   */
  loadCreditableInvoice(
    billingAccountId: string,
    invoiceId: string,
  ): Promise<CreditableInvoice | null>;
}

export const ACCOUNT_ADJUSTMENT_REPOSITORY = Symbol('ACCOUNT_ADJUSTMENT_REPOSITORY');
