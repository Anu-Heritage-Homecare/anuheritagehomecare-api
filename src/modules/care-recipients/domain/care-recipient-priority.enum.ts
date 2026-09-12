/**
 * Clinical/operational priority of a care recipient, set by the office. Drives the
 * Priority column and the High Priority filter on the admin Care Recipients screen.
 * Declared in the domain layer so it is independent of the Prisma generated enum.
 */
export enum CareRecipientPriority {
  Critical = 'CRITICAL',
  Urgent = 'URGENT',
  High = 'HIGH',
  Medium = 'MEDIUM',
  Normal = 'NORMAL',
  Low = 'LOW',
}

/** Severity rank per priority: higher is more urgent. Used for sorting. */
export const CARE_RECIPIENT_PRIORITY_RANK: Record<CareRecipientPriority, number> = {
  [CareRecipientPriority.Critical]: 6,
  [CareRecipientPriority.Urgent]: 5,
  [CareRecipientPriority.High]: 4,
  [CareRecipientPriority.Medium]: 3,
  [CareRecipientPriority.Normal]: 2,
  [CareRecipientPriority.Low]: 1,
};

/** The priorities that count under the "High Priority" filter tab. */
export const HIGH_PRIORITY_LEVELS: readonly CareRecipientPriority[] = [
  CareRecipientPriority.Critical,
  CareRecipientPriority.Urgent,
  CareRecipientPriority.High,
];
