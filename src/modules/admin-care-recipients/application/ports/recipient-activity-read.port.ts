/** The audit trail groups every event into one of three categories, matching the badges. */
export type ActivityCategory = 'VISITS' | 'MEDICAL' | 'ADMINISTRATIVE';

export const ALL_ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  'VISITS',
  'MEDICAL',
  'ADMINISTRATIVE',
];

export interface ActivityEventView {
  /** Stable synthetic id, "<source>:<rowId>", so the client can key the row. */
  id: string;
  occurredAt: Date;
  category: ActivityCategory;
  /** The event type key, for example VISIT_STARTED or MEDICATION_ADMINISTERED. */
  type: string;
  title: string;
  description: string;
  /** Who performed the event (resolved), or null when captured without an author. */
  performedByName: string | null;
  /** Their role label (Caregiver, Coordinator, or a free text note role), or null. */
  performedByRole: string | null;
}

/**
 * Read model for the admin Activity screen (the System Audit Trail). Composes recorded
 * events across contexts (visit attendance and notes, medication administrations,
 * vitals, care notes, care plan revisions and invoices) into one chronological feed,
 * resolving each performer's name. Bounded by a time window; the use case filters,
 * paginates and derives the user list.
 */
export interface RecipientActivityReadModel {
  listSince(recipientId: string, since: Date): Promise<ActivityEventView[]>;
}

export const RECIPIENT_ACTIVITY_READ_MODEL = Symbol('RECIPIENT_ACTIVITY_READ_MODEL');
