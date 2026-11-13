/**
 * The lifecycle status of an adjustment. New ones start awaiting approval; approving a
 * refund moves it to processing (money settles asynchronously), while a credit, write
 * off or adjustment completes at once. Any correction can later be reversed (voided).
 * The frontend labels these per category (a credit reads "Pending"/"Applied", a refund
 * reads "Pending Approval"/"Processing"/"Completed").
 */
export enum AccountAdjustmentStatus {
  PendingApproval = 'PENDING_APPROVAL',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Rejected = 'REJECTED',
  Reversed = 'REVERSED',
}

export const ALL_ACCOUNT_ADJUSTMENT_STATUSES: AccountAdjustmentStatus[] =
  Object.values(AccountAdjustmentStatus);
