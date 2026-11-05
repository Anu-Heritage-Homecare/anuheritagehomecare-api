/** The kind of financial correction, one per tab on the Credits & Adjustments screen. */
export enum AccountAdjustmentCategory {
  Credit = 'CREDIT',
  Refund = 'REFUND',
  WriteOff = 'WRITE_OFF',
  Adjustment = 'ADJUSTMENT',
}

export const ALL_ACCOUNT_ADJUSTMENT_CATEGORIES: AccountAdjustmentCategory[] =
  Object.values(AccountAdjustmentCategory);

/** The reference prefix per category (CRD-2026-001, REF-..., WRO-..., ADJ-...). */
export const ADJUSTMENT_REFERENCE_PREFIX: Record<AccountAdjustmentCategory, string> = {
  [AccountAdjustmentCategory.Credit]: 'CRD',
  [AccountAdjustmentCategory.Refund]: 'REF',
  [AccountAdjustmentCategory.WriteOff]: 'WRF',
  [AccountAdjustmentCategory.Adjustment]: 'ADJ',
};

/**
 * The display reference, PREFIX-year-sequence. The sequence is a single counter
 * across every category, so numbers are unique but not contiguous within a tab.
 */
export function adjustmentReference(
  category: AccountAdjustmentCategory,
  sequence: number,
  createdAt: Date,
): string {
  return `${ADJUSTMENT_REFERENCE_PREFIX[category]}-${createdAt.getUTCFullYear()}-${String(
    sequence,
  ).padStart(3, '0')}`;
}
