import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';

/** Filters and paging for the Credits & Adjustments list. */
export interface AccountAdjustmentsFilter {
  /** The active tab; null is no category filter (the counts always cover every tab). */
  category: AccountAdjustmentCategory | null;
  status: AccountAdjustmentStatus | null;
  /** Exact Type column value (for example "Account Credit"). */
  type: string | null;
  /** Matches reference, billing account name or reason. */
  search: string | null;
  /** Inclusive amount window in minor units; null ends are open. */
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  page: number;
  pageSize: number;
}

/** One row of the Credits & Adjustments table. */
export interface AccountAdjustmentRowView {
  id: string;
  sequence: number;
  category: AccountAdjustmentCategory;
  type: string;
  billingAccountId: string;
  /** The billing account label, null when the account could not be resolved. */
  billingAccountName: string | null;
  amountMinor: number;
  currency: string;
  /** Shown beside the amount on the Write-offs tab (the "AmountReason" column). */
  reason: string;
  status: AccountAdjustmentStatus;
  createdAt: Date;
}

/** The per tab counts (one per category). */
export interface AccountAdjustmentCounts {
  credits: number;
  refunds: number;
  writeOffs: number;
  adjustments: number;
}

export interface AccountAdjustmentsView {
  rows: AccountAdjustmentRowView[];
  total: number;
  counts: AccountAdjustmentCounts;
  /** The distinct Type values present, for the Type filter dropdown. */
  types: string[];
}

/**
 * Read model for the Credits & Adjustments list: adjustments composed with their
 * billing account name, with per category counts and the distinct type values.
 */
export interface AccountAdjustmentsReadModel {
  list(filter: AccountAdjustmentsFilter): Promise<AccountAdjustmentsView>;
}

export const ACCOUNT_ADJUSTMENTS_READ_MODEL = Symbol('ACCOUNT_ADJUSTMENTS_READ_MODEL');
