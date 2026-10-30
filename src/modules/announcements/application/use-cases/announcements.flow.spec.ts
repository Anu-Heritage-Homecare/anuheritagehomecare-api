import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AnnouncementAudience } from '../../domain/announcement-audience.enum';
import { AnnouncementStatus } from '../../domain/announcement-status.enum';
import { Announcement } from '../../domain/announcement.entity';
import { AnnouncementRepository } from '../../domain/announcement.repository';
import { dateLabel, humanLabel, timelineLabel } from '../announcements.presenter';
import { AnnouncementListRead, AnnouncementsReadModel } from '../ports/announcements-read.port';
import { ArchiveAnnouncementUseCase } from './archive-announcement.use-case';
import { CreateAnnouncementUseCase } from './create-announcement.use-case';
import { DuplicateAnnouncementUseCase } from './duplicate-announcement.use-case';
import { GetAnnouncementUseCase } from './get-announcement.use-case';
import { ListAnnouncementsUseCase } from './list-announcements.use-case';
import { PublishAnnouncementUseCase } from './publish-announcement.use-case';

const NOW = new Date('2026-10-30T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function repo(seed: Announcement[] = []): AnnouncementRepository & { saved: Announcement[] } {
  const store = new Map(seed.map((a) => [a.id, a]));
  const saved: Announcement[] = [];
  return {
    saved,
    save: (a) => {
      saved.push(a);
      store.set(a.id, a);
      return Promise.resolve();
    },
    findById: (id) => Promise.resolve(store.get(id) ?? null),
  };
}

function draft(id = 'a1'): Announcement {
  return Announcement.create({
    id,
    title: 'July Schedule Changes',
    body: 'Please review.',
    audiences: [AnnouncementAudience.AllStaff],
    authorAdminId: 'author-1',
    now: new Date('2026-07-15T09:00:00.000Z'),
  });
}

describe('presenter', () => {
  it('humanises enums and formats dates', () => {
    expect(humanLabel('ALL_STAFF')).toBe('All Staff');
    expect(humanLabel('DRAFT')).toBe('Draft');
    expect(dateLabel(new Date('2026-07-05T12:00:00.000Z'))).toBe('Jul 05, 2026');
    expect(
      timelineLabel({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-07-15T00:00:00.000Z'),
        scheduledFor: null,
        archivedAt: null,
        updatedAt: NOW,
      }),
    ).toBe('Published Jul 15, 2026');
    expect(
      timelineLabel({
        status: 'SCHEDULED',
        publishedAt: null,
        scheduledFor: new Date('2026-07-20T00:00:00.000Z'),
        archivedAt: null,
        updatedAt: NOW,
      }),
    ).toBe('Scheduled Jul 20, 2026');
  });
});

describe('Announcement entity', () => {
  it('rejects a second archive and publishing an archived announcement', () => {
    const a = draft();
    a.archive(NOW);
    expect(a.status).toBe(AnnouncementStatus.Archived);
    expect(() => a.archive(NOW)).toThrow(ValidationException);
    expect(() => a.publish(NOW)).toThrow(ValidationException);
  });

  it('rejects scheduling for a past time', () => {
    const a = draft();
    expect(() => a.schedule(new Date('2020-01-01T00:00:00.000Z'), NOW)).toThrow(
      ValidationException,
    );
  });
});

describe('CreateAnnouncementUseCase', () => {
  const command = {
    authorAdminId: 'author-1',
    title: 'July Schedule Changes',
    body: 'Please review.',
    audiences: [AnnouncementAudience.AllStaff, AnnouncementAudience.Caregivers],
  };

  it('saves a draft with the selected audiences', async () => {
    const r = repo();
    await new CreateAnnouncementUseCase(r, ids(), clock).execute({
      ...command,
      action: 'DRAFT',
      scheduledFor: null,
    });
    expect(r.saved[0].status).toBe(AnnouncementStatus.Draft);
    expect(r.saved[0].audiences).toEqual([
      AnnouncementAudience.AllStaff,
      AnnouncementAudience.Caregivers,
    ]);
  });

  it('publishes now', async () => {
    const r = repo();
    await new CreateAnnouncementUseCase(r, ids(), clock).execute({
      ...command,
      action: 'PUBLISH',
      scheduledFor: null,
    });
    expect(r.saved[0].status).toBe(AnnouncementStatus.Published);
    expect(r.saved[0].publishedAt).toEqual(NOW);
  });

  it('schedules for a future time', async () => {
    const r = repo();
    const when = new Date('2026-11-01T09:00:00.000Z');
    await new CreateAnnouncementUseCase(r, ids(), clock).execute({
      ...command,
      action: 'SCHEDULE',
      scheduledFor: when,
    });
    expect(r.saved[0].status).toBe(AnnouncementStatus.Scheduled);
    expect(r.saved[0].scheduledFor).toEqual(when);
  });

  it('rejects scheduling without a time', async () => {
    await expect(
      new CreateAnnouncementUseCase(repo(), ids(), clock).execute({
        ...command,
        action: 'SCHEDULE',
        scheduledFor: null,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});

describe('DuplicateAnnouncementUseCase', () => {
  it('creates a draft copy authored by the acting admin', async () => {
    const r = repo([draft('a1')]);
    const result = await new DuplicateAnnouncementUseCase(r, ids(), clock).execute('admin-9', 'a1');
    expect(result.id).toBe('id-1');
    expect(r.saved[0].title).toBe('July Schedule Changes (Copy)');
    expect(r.saved[0].status).toBe(AnnouncementStatus.Draft);
    expect(r.saved[0].authorAdminId).toBe('admin-9');
  });

  it('throws when the source is missing', async () => {
    await expect(
      new DuplicateAnnouncementUseCase(repo(), ids(), clock).execute('admin-9', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ArchiveAnnouncementUseCase and PublishAnnouncementUseCase', () => {
  it('archives an existing announcement', async () => {
    const r = repo([draft('a1')]);
    await new ArchiveAnnouncementUseCase(r, clock).execute('a1');
    expect(r.saved[0].status).toBe(AnnouncementStatus.Archived);
  });

  it('publishes an existing draft', async () => {
    const r = repo([draft('a1')]);
    await new PublishAnnouncementUseCase(r, clock).execute('a1');
    expect(r.saved[0].status).toBe(AnnouncementStatus.Published);
  });

  it('both throw when the announcement is missing', async () => {
    await expect(new ArchiveAnnouncementUseCase(repo(), clock).execute('x')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
    await expect(new PublishAnnouncementUseCase(repo(), clock).execute('x')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});

describe('ListAnnouncementsUseCase and GetAnnouncementUseCase', () => {
  it('maps rows with labels', async () => {
    const read: AnnouncementListRead = {
      counts: { draft: 3, scheduled: 2, published: 12, archived: 8 },
      rows: [
        {
          id: 'a1',
          title: 'July Schedule Changes',
          audiences: ['ALL_STAFF', 'CAREGIVERS'],
          priority: 'NORMAL',
          status: 'PUBLISHED',
          authorName: 'Sarah Jenkins',
          authorPhotoKey: null,
          scheduledFor: null,
          publishedAt: new Date('2026-07-15T00:00:00.000Z'),
          archivedAt: null,
          createdAt: new Date('2026-07-15T00:00:00.000Z'),
          updatedAt: new Date('2026-07-15T00:00:00.000Z'),
        },
      ],
    };
    const reads: AnnouncementsReadModel = {
      list: () => Promise.resolve(read),
      getById: () => Promise.resolve(null),
    };
    const result = await new ListAnnouncementsUseCase(reads).execute('PUBLISHED');
    expect(result.counts.published).toBe(12);
    expect(result.announcements[0]).toMatchObject({
      audienceLabels: ['All Staff', 'Caregivers'],
      statusLabel: 'Published',
      dateLabel: 'Published Jul 15, 2026',
      authorName: 'Sarah Jenkins',
    });
  });

  it('throws when the announcement is not found', async () => {
    const reads: AnnouncementsReadModel = {
      list: () => Promise.resolve({} as AnnouncementListRead),
      getById: () => Promise.resolve(null),
    };
    await expect(new GetAnnouncementUseCase(reads).execute('nope')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
