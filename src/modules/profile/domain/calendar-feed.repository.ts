import { CalendarFeed } from './calendar-feed.entity';

/** Persistence port for calendar feeds. */
export interface CalendarFeedRepository {
  save(feed: CalendarFeed): Promise<void>;
  findByUserId(userId: string): Promise<CalendarFeed | null>;
  findByToken(token: string): Promise<CalendarFeed | null>;
}

export const CALENDAR_FEED_REPOSITORY = Symbol('CALENDAR_FEED_REPOSITORY');
