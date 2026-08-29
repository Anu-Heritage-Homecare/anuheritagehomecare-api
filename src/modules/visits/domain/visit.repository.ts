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
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const VISIT_REPOSITORY = Symbol('VISIT_REPOSITORY');
