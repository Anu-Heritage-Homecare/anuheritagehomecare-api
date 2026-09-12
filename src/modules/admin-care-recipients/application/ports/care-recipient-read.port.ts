import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';

/** Which filter tab (and thus which subset) the admin list is showing. */
export type CareRecipientTab = 'ALL' | 'ACTIVE' | 'ON_HOLD' | 'HIGH_PRIORITY' | 'NEW';

/** Sortable columns on the admin care recipients table. */
export type CareRecipientSortField = 'NAME' | 'AGE' | 'PRIORITY' | 'STATUS' | 'RECENT';

export interface CareRecipientListQuery {
  tab: CareRecipientTab;
  search: string | null;
  sortField: CareRecipientSortField;
  sortDirection: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
  /** Cut off used to classify a recently added recipient as New. */
  newSince: Date;
}

/** A raw care recipient row for the admin list, before cross context enrichment. */
export interface CareRecipientRowView {
  id: string;
  recipientNumber: number;
  name: string;
  photoKey: string | null;
  dateOfBirth: Date;
  medicalConditions: string[];
  careFrequency: CareFrequency | null;
  status: CareRecipientStatus;
  priority: CareRecipientPriority;
  primaryCaregiverId: string | null;
  createdAt: Date;
}

export interface CareRecipientPageView {
  rows: CareRecipientRowView[];
  /** Total rows matching the tab and search, for pagination. */
  total: number;
}

/** Global counts for the summary cards, filter tabs and action triggers. */
export interface CareRecipientCountsView {
  total: number;
  active: number;
  onHold: number;
  discharged: number;
  newThisMonth: number;
  highPriority: number;
  newCount: number;
  missingCarePlan: number;
}

/**
 * Read port for the admin care recipients screen. A dedicated query model (not the
 * domain repository) because it serves paginated, filtered, sorted lists and
 * aggregate counts that the aggregate does not need to know about. Drafts (still
 * mid onboarding) are excluded from every count and page.
 */
export interface CareRecipientReadModel {
  listPage(query: CareRecipientListQuery): Promise<CareRecipientPageView>;
  counts(monthStart: Date, newSince: Date): Promise<CareRecipientCountsView>;
  /** The database assigned sequential number for one recipient, for the CR-001 code. */
  recipientNumberById(id: string): Promise<number | null>;
}

export const CARE_RECIPIENT_READ_MODEL = Symbol('CARE_RECIPIENT_READ_MODEL');
