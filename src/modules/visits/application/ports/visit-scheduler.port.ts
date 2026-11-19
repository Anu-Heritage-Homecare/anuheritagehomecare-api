export interface OneOffVisitDetails {
  careRecipientId: string;
  date: Date;
  startMinute: number;
  endMinute: number;
}

export interface SubscriptionVisitDetails {
  careRecipientId: string;
  startDate: Date;
}

/**
 * Generates the Unassigned visits an office action implies, so the office only
 * has to assign a caregiver. Implemented in the visits context and called when a
 * booking is confirmed, a subscription is activated, or an additional care
 * request is approved.
 */
export interface VisitScheduler {
  /** One visit for a single session, on a date and window (a booking or an approved care request). */
  scheduleOneOff(details: OneOffVisitDetails): Promise<void>;
  /** The recurring visits a newly active monthly subscription implies, from the recipient's care schedule. */
  scheduleForSubscription(details: SubscriptionVisitDetails): Promise<void>;
}

export const VISIT_SCHEDULER = Symbol('VISIT_SCHEDULER');
