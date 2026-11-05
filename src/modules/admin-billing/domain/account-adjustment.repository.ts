import { AccountAdjustment } from './account-adjustment.entity';

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
}

export const ACCOUNT_ADJUSTMENT_REPOSITORY = Symbol('ACCOUNT_ADJUSTMENT_REPOSITORY');
