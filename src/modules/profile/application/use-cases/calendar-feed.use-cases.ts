import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@config/configuration';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CalendarFeed } from '../../domain/calendar-feed.entity';
import {
  CALENDAR_FEED_REPOSITORY,
  CalendarFeedRepository,
} from '../../domain/calendar-feed.repository';
import { IcsEvent, buildIcs, toFloatingLocal } from '../services/ics.util';

export interface CalendarFeedView {
  url: string;
}

/** How far ahead the feed publishes visits. */
const FEED_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Builds the absolute feed URL from a token, using the configured public base URL. */
function feedUrl(config: ConfigService, token: string): string {
  const app = config.getOrThrow<AppConfig>('app');
  const base = app.publicUrl.replace(/\/+$/, '');
  return `${base}/${app.apiPrefix}/v${app.apiDefaultVersion}/family/calendar/${token}.ics`;
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Use case: the owner's private calendar feed URL, minting a token on first use.
 * Idempotent: repeated reads return the same URL until it is regenerated.
 */
@Injectable()
export class GetCalendarFeedUseCase {
  constructor(
    @Inject(CALENDAR_FEED_REPOSITORY) private readonly feeds: CalendarFeedRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  async execute(query: { userId: string }): Promise<CalendarFeedView> {
    let feed = await this.feeds.findByUserId(query.userId);
    if (feed === null) {
      feed = CalendarFeed.issue({ userId: query.userId, token: newToken(), now: this.clock.now() });
      await this.feeds.save(feed);
    }
    return { url: feedUrl(this.config, feed.token) };
  }
}

/** Use case: rotate the feed token, invalidating the previous URL. Owner scoped. */
@Injectable()
export class RegenerateCalendarFeedUseCase {
  constructor(
    @Inject(CALENDAR_FEED_REPOSITORY) private readonly feeds: CalendarFeedRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  async execute(command: { userId: string }): Promise<CalendarFeedView> {
    const now = this.clock.now();
    const feed = await this.feeds.findByUserId(command.userId);
    if (feed === null) {
      const created = CalendarFeed.issue({ userId: command.userId, token: newToken(), now });
      await this.feeds.save(created);
      return { url: feedUrl(this.config, created.token) };
    }
    feed.regenerate(newToken(), now);
    await this.feeds.save(feed);
    return { url: feedUrl(this.config, feed.token) };
  }
}

/**
 * Use case: render the ICS document for a feed token. Public (a calendar app can
 * only present the token), so it exposes only the schedule: visit times and the
 * recipient's first name. No health notes, addresses or other personal data.
 */
@Injectable()
export class GetCalendarIcsUseCase {
  constructor(
    @Inject(CALENDAR_FEED_REPOSITORY) private readonly feeds: CalendarFeedRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: { token: string }): Promise<string> {
    const feed = await this.feeds.findByToken(query.token);
    if (feed === null) {
      throw new NotFoundDomainException('Calendar feed not found');
    }

    const now = this.clock.now();
    const recipients = await this.recipients.listByOwner(feed.userId);
    const firstNameById = new Map(
      recipients.map((recipient) => [recipient.id, firstName(recipient.profile.name)]),
    );

    let events: IcsEvent[] = [];
    if (recipients.length > 0) {
      const from = startOfUtcDay(now);
      const to = new Date(from.getTime() + FEED_WINDOW_DAYS * DAY_MS);
      const visits = await this.visits.listForCareRecipientsInRange(
        recipients.map((recipient) => recipient.id),
        from,
        to,
      );
      events = visits.map((visit) => this.toEvent(visit, firstNameById));
    }

    return buildIcs({ calendarName: 'Care Schedule', dtstamp: now, events });
  }

  private toEvent(
    visit: {
      id: string;
      careRecipientId: string;
      scheduledDate: Date;
      status: VisitStatus;
      window: { startMinute: number; endMinute: number };
    },
    firstNameById: Map<string, string>,
  ): IcsEvent {
    const dayMs = visit.scheduledDate.getTime();
    const start = new Date(dayMs + visit.window.startMinute * 60 * 1000);
    const end = new Date(dayMs + visit.window.endMinute * 60 * 1000);
    const name = firstNameById.get(visit.careRecipientId) ?? 'care recipient';
    return {
      uid: `${visit.id}@anuheritagehomecare`,
      start: toFloatingLocal(start),
      end: toFloatingLocal(end),
      summary: `Care visit: ${name}`,
      status: visit.status === VisitStatus.Cancelled ? 'CANCELLED' : 'CONFIRMED',
    };
  }
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(' ');
  return space === -1 ? trimmed : trimmed.slice(0, space);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
