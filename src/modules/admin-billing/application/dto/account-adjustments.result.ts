import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import { AccountAdjustmentCounts } from '../ports/account-adjustments-read.port';

/** One row of the Credits & Adjustments list. Money is minor units, date is ISO. */
export interface AccountAdjustmentRowResult {
  id: string;
  reference: string;
  category: AccountAdjustmentCategory;
  type: string;
  billingAccountId: string;
  billingAccountName: string | null;
  amountMinor: number;
  currency: string;
  reason: string;
  status: AccountAdjustmentStatus;
  createdAt: string;
}

export interface AccountAdjustmentsListResult {
  adjustments: AccountAdjustmentRowResult[];
  tabs: AccountAdjustmentCounts;
  types: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** The id and reference of a newly created adjustment. */
export interface AccountAdjustmentCreatedResult {
  id: string;
  reference: string;
  createdAt: string;
}
