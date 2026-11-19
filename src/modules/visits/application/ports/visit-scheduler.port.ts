export interface BookingVisitDetails {
  careRecipientId: string;
  serviceDate: Date;
  startMinute: number;
  endMinute: number;
}

export interface SubscriptionVisitDetails {
  careRecipientId: string;
  startDate: Date;
}

/**
 * Generates the Unassigned visits a paid booking or an activated subscription
 * implies, so the office only has to assign a caregiver. Implemented in the
 * visits context and called from the payments confirmation path when a booking
 * is first confirmed or a subscription is first activated.
 */
export interface VisitScheduler {
  /** One visit for a paid pay as you go booking, on its service date and window. */
  scheduleForBooking(details: BookingVisitDetails): Promise<void>;
  /** The recurring visits a newly active monthly subscription implies, from the recipient's care schedule. */
  scheduleForSubscription(details: SubscriptionVisitDetails): Promise<void>;
}

export const VISIT_SCHEDULER = Symbol('VISIT_SCHEDULER');
