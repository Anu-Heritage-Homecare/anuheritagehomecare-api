import { Visit } from './visit.entity';

/**
 * Persistence port for the Visit aggregate. The caregiver schedule reads visits
 * for one caregiver, filtered by a single day or an inclusive date range; both
 * queries are ordered chronologically and indexed on `[caregiverId, scheduledDate]`.
 */
export interface VisitRepository {
  save(visit: Visit): Promise<void>;
  findById(id: string): Promise<Visit | null>;
  listForCaregiverInRange(caregiverId: string, from: Date, to: Date): Promise<Visit[]>;
  /**
   * Visits for several care recipients within a date range, ordered
   * chronologically. Backs the family owner dashboard, which reads the day's
   * visits for the recipients they own in one query (no query per recipient).
   */
  listForCareRecipientsInRange(careRecipientIds: string[], from: Date, to: Date): Promise<Visit[]>;
  /**
   * Every visit within a date range, across all caregivers and recipients, ordered
   * chronologically. Backs the admin operations dashboard, which reads the whole
   * day's schedule in one query.
   */
  listForDateRange(from: Date, to: Date): Promise<Visit[]>;
  /**
   * The current visit for one care recipient: an active visit (in progress or on
   * break) if any, otherwise the earliest scheduled one, or null. Backs the current
   * visit card in the family Care section without loading the whole history.
   */
  findCurrentForCareRecipient(careRecipientId: string): Promise<Visit | null>;
  /**
   * A page of a recipient's completed visits, newest first, with the total count.
   * Backs the paginated past visits list in the family Care section so the query is
   * bounded instead of fetching every visit.
   */
  listCompletedForCareRecipient(
    careRecipientId: string,
    limit: number,
    offset: number,
  ): Promise<{ visits: Visit[]; total: number }>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const VISIT_REPOSITORY = Symbol('VISIT_REPOSITORY');
