import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AnnouncementDetailResult } from '../dto/announcement-detail.result';
import { humanLabel, timelineLabel } from '../announcements.presenter';
import { ANNOUNCEMENTS_READ_MODEL, AnnouncementsReadModel } from '../ports/announcements-read.port';

/** Use case: load a single announcement for the View screen. */
@Injectable()
export class GetAnnouncementUseCase {
  constructor(@Inject(ANNOUNCEMENTS_READ_MODEL) private readonly reads: AnnouncementsReadModel) {}

  async execute(id: string): Promise<AnnouncementDetailResult> {
    const row = await this.reads.getById(id);
    if (row === null) {
      throw new NotFoundDomainException('Announcement not found');
    }
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      audienceLabels: row.audiences.map((a) => humanLabel(a)),
      priorityLabel: humanLabel(row.priority),
      statusLabel: humanLabel(row.status),
      dateLabel: timelineLabel(row),
      authorName: row.authorName,
      authorPhotoKey: row.authorPhotoKey,
      scheduledFor: row.scheduledFor?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
