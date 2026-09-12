/**
 * Read port over the visits context for the care recipients screen: the last
 * visit per recipient (for the Last Visit column) and which recipients have an
 * overdue visit (a scheduled visit whose day has passed without being carried
 * out), for the Overdue Visit action trigger.
 */
export interface CareActivityDirectory {
  /** Most recent visit date per recipient id, for the page's recipients. */
  latestVisitByRecipients(recipientIds: string[]): Promise<Map<string, Date>>;
  /** How many distinct recipients currently have an overdue scheduled visit. */
  countRecipientsWithOverdueVisit(now: Date): Promise<number>;
}

export const CARE_ACTIVITY_DIRECTORY = Symbol('CARE_ACTIVITY_DIRECTORY');
