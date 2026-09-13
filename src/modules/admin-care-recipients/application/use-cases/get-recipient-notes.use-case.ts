import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { ALL_NOTE_CATEGORIES, NoteCategory } from '@modules/care-notes/domain/note-category.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  NoteRowView,
  RECIPIENT_NOTES_READ_MODEL,
  RecipientNotesReadModel,
} from '../ports/recipient-notes-read.port';
import { NoteItemResult, RecipientNotesResult } from '../dto/recipient-notes.result';

export interface GetRecipientNotesQuery {
  recipientId: string;
  category: NoteCategory | null;
  search: string | null;
  authorName: string | null;
  page: number;
  pageSize: number;
}

/**
 * Use case: assemble one recipient's Notes tab. Composes the summary snapshot (total,
 * this month and flagged for review), the category tab counts, the distinct author
 * list for the author filter, and the filtered, searched and paginated note feed.
 */
@Injectable()
export class GetRecipientNotesUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_NOTES_READ_MODEL) private readonly readModel: RecipientNotesReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetRecipientNotesQuery): Promise<RecipientNotesResult> {
    if ((await this.recipients.findById(query.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [page, counts, authors] = await Promise.all([
      this.readModel.listPage({
        recipientId: query.recipientId,
        category: query.category,
        search: query.search,
        authorName: query.authorName,
        page: query.page,
        pageSize: query.pageSize,
      }),
      this.readModel.counts(query.recipientId, monthStart),
      this.readModel.authors(query.recipientId),
    ]);

    const totalPages = query.pageSize > 0 ? Math.ceil(page.total / query.pageSize) : 0;

    return {
      summary: {
        totalNotes: counts.total,
        thisMonth: counts.thisMonth,
        flaggedForReview: counts.flaggedForReview,
      },
      all: counts.total,
      categories: ALL_NOTE_CATEGORIES.map((category) => ({
        category: String(category),
        count: counts.byCategory.get(category) ?? 0,
      })),
      authors,
      page: {
        items: page.rows.map((row) => this.toItem(row)),
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages,
      },
    };
  }

  private toItem(row: NoteRowView): NoteItemResult {
    return {
      id: row.id,
      category: String(row.category),
      content: row.content,
      authorName: row.authorName,
      authorRole: row.authorRole,
      postedAt: row.postedAt,
      flaggedForReview: row.flaggedForReview,
      acknowledged: row.acknowledgedAt !== null,
      acknowledgedAt: row.acknowledgedAt,
      commentCount: row.commentCount,
      attachmentCount: row.attachmentCount,
    };
  }
}
