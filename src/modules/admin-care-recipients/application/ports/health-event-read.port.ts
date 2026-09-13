import { HealthEventCategory } from '@modules/care-recipients/domain/health-event-category.enum';

export interface HealthEventFilter {
  recipientId: string;
  /** Restrict to these categories, or null for all. */
  categories: HealthEventCategory[] | null;
  search: string | null;
  page: number;
  pageSize: number;
}

export interface HealthEventRowView {
  id: string;
  category: HealthEventCategory;
  title: string;
  description: string;
  recordedByName: string | null;
  recordedByRole: string | null;
  occurredAt: Date;
}

export interface HealthEventPageView {
  rows: HealthEventRowView[];
  total: number;
}

/**
 * Read model for a recipient's health timeline. A dedicated query model (not the
 * domain repository) because it serves a filtered, searched, paginated feed plus
 * the next upcoming appointment for the summary card.
 */
export interface HealthEventReadModel {
  listPage(filter: HealthEventFilter): Promise<HealthEventPageView>;
  /** The soonest event at or after `now` in the given categories, or null. */
  nextInCategories(
    recipientId: string,
    now: Date,
    categories: HealthEventCategory[],
  ): Promise<HealthEventRowView | null>;
}

export const HEALTH_EVENT_READ_MODEL = Symbol('HEALTH_EVENT_READ_MODEL');
