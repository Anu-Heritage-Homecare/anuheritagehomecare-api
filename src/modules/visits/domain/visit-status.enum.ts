/**
 * Lifecycle of a care visit. A visit is SCHEDULED when planned, IN_PROGRESS once
 * the caregiver starts it, and COMPLETED when finished. CANCELLED and MISSED are
 * terminal exceptions. The status transitions (check in, complete) belong to the
 * visit execution flow and are not built yet; the schedule reads the stored value.
 */
export enum VisitStatus {
  Scheduled = 'SCHEDULED',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  Missed = 'MISSED',
}

/** Every valid visit status, used to validate incoming filter values. */
export const ALL_VISIT_STATUSES: readonly VisitStatus[] = Object.values(VisitStatus);
