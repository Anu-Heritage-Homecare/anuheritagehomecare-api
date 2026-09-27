/**
 * How urgent a visit is, surfaced on the operations schedule so coordinators can
 * triage. Declared in the domain layer so it is independent of the Prisma
 * generated enum.
 */
export enum VisitPriority {
  Low = 'LOW',
  Normal = 'NORMAL',
  High = 'HIGH',
  Urgent = 'URGENT',
  Critical = 'CRITICAL',
}

/** Every valid visit priority, used to validate incoming filter values. */
export const ALL_VISIT_PRIORITIES: readonly VisitPriority[] = Object.values(VisitPriority);
