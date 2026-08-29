/**
 * Lifecycle of a family owner's request for additional care. It is created
 * PENDING and later actioned by the office (approved, declined) or withdrawn by
 * the family (cancelled). The office surface is not built yet; the request is
 * captured and stored for review.
 */
export enum CareRequestStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Cancelled = 'CANCELLED',
}
