import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@config/configuration';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CalendarFeed } from '../../domain/calendar-feed.entity';
import { CalendarFeedRepository } from '../../domain/calendar-feed.repository';
import { GetCalendarFeedUseCase, GetCalendarIcsUseCase } from './calendar-feed.use-cases';

const NOW = new Date('2026-09-06T08:00:00.000Z');
const clock: Clock = { now: () => NOW };

function config(): ConfigService {
  const app: Partial<AppConfig> = {
    publicUrl: 'https://api.example.com',
    apiPrefix: 'api',
    apiDefaultVersion: '1',
  };
  return { getOrThrow: () => app } as unknown as ConfigService;
}

class InMemoryFeeds implements CalendarFeedRepository {
  public store = new Map<string, CalendarFeed>();
  save(feed: CalendarFeed): Promise<void> {
    this.store.set(feed.userId, feed);
    return Promise.resolve();
  }
  findByUserId(userId: string): Promise<CalendarFeed | null> {
    return Promise.resolve(this.store.get(userId) ?? null);
  }
  findByToken(token: string): Promise<CalendarFeed | null> {
    return Promise.resolve([...this.store.values()].find((f) => f.token === token) ?? null);
  }
}

function recipient(id: string, name: string): CareRecipient {
  return { id, ownerId: 'owner-1', profile: { name } } as unknown as CareRecipient;
}

function visit(id: string, recipientId: string, status: VisitStatus): Visit {
  return {
    id,
    careRecipientId: recipientId,
    scheduledDate: new Date('2026-09-10T00:00:00.000Z'),
    status,
    window: { startMinute: 9 * 60, endMinute: 12 * 60 },
  } as unknown as Visit;
}

describe('calendar feed', () => {
  it('mints a stable, absolute feed URL on first read', async () => {
    const feeds = new InMemoryFeeds();
    const useCase = new GetCalendarFeedUseCase(feeds, clock, config());

    const first = await useCase.execute({ userId: 'owner-1' });
    expect(first.url).toMatch(/^https:\/\/api\.example\.com\/api\/v1\/family\/calendar\/.+\.ics$/);

    const second = await useCase.execute({ userId: 'owner-1' });
    expect(second.url).toBe(first.url);
    expect(feeds.store.size).toBe(1);
  });

  it('renders the schedule as ICS with floating local times and no personal data', async () => {
    const feeds = new InMemoryFeeds();
    await feeds.save(CalendarFeed.issue({ userId: 'owner-1', token: 'tok-123', now: NOW }));
    const recipients = {
      listByOwner: () => Promise.resolve([recipient('r1', 'Mary Rose')]),
    } as unknown as CareRecipientRepository;
    const visits = {
      listForCareRecipientsInRange: () =>
        Promise.resolve([
          visit('v1', 'r1', VisitStatus.Scheduled),
          visit('v2', 'r1', VisitStatus.Cancelled),
        ]),
    } as unknown as VisitRepository;

    const ics = await new GetCalendarIcsUseCase(feeds, recipients, visits, clock).execute({
      token: 'tok-123',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:v1@anuheritagehomecare');
    // Floating local time: 9:00 start on the visit day.
    expect(ics).toContain('DTSTART:20260910T090000');
    expect(ics).toContain('DTEND:20260910T120000');
    // Only the first name is exposed.
    expect(ics).toContain('SUMMARY:Care visit: Mary');
    expect(ics).not.toContain('Rose');
    // A cancelled visit is marked, not hidden.
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('404s an unknown feed token', async () => {
    const feeds = new InMemoryFeeds();
    const recipients = {
      listByOwner: () => Promise.resolve([]),
    } as unknown as CareRecipientRepository;
    const visits = {
      listForCareRecipientsInRange: () => Promise.resolve([]),
    } as unknown as VisitRepository;

    await expect(
      new GetCalendarIcsUseCase(feeds, recipients, visits, clock).execute({ token: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
