import { Inject, Injectable } from '@nestjs/common';
import { AnnouncementListResult } from '../dto/announcements-list.result';
import { humanLabel, timelineLabel } from '../announcements.presenter';
import {
  ANNOUNCEMENTS_READ_MODEL,
  AnnouncementsReadModel,
  AnnouncementTab,
} from '../ports/announcements-read.port';

/** Use case: the announcements list for a tab, with the per tab counts. */
@Injectable()
export class ListAnnouncementsUseCase {
  constructor(@Inject(ANNOUNCEMENTS_READ_MODEL) private readonly reads: AnnouncementsReadModel) {}

  async execute(tab: AnnouncementTab): Promise<AnnouncementListResult> {
    const { counts, rows } = await this.reads.list(tab);
    return {
      counts,
      announcements: rows.map((row) => ({
        id: row.id,
        title: row.title,
        audienceLabels: row.audiences.map((a) => humanLabel(a)),
        statusLabel: humanLabel(row.status),
        dateLabel: timelineLabel(row),
        authorName: row.authorName,
        authorPhotoKey: row.authorPhotoKey,
      })),
    };
  }
}
