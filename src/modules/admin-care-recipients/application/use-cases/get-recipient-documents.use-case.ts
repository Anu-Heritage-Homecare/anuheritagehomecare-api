import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  ALL_DOCUMENT_CATEGORIES,
  DocumentCategory,
} from '@modules/care-recipients/domain/document-category.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  DocumentFilter,
  DocumentRowView,
  DocumentSortField,
  RECIPIENT_DOCUMENT_READ_MODEL,
  RecipientDocumentReadModel,
} from '../ports/recipient-document-read.port';
import { DocumentItemResult, RecipientDocumentsResult } from '../dto/recipient-documents.result';

export interface GetRecipientDocumentsQuery {
  recipientId: string;
  category: DocumentCategory | null;
  search: string | null;
  sortField: DocumentSortField;
  sortDirection: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

const MS_PER_DAY = 86_400_000;
/** A document expiring within this many days is flagged Expiring Soon. */
const EXPIRING_WINDOW_DAYS = 30;
const ACTIVITY_LIMIT = 5;
const DISPLAY_EXPIRING_SOON = 'EXPIRING_SOON';

/**
 * Use case: assemble one recipient's Documents tab. Composes the summary cards, the
 * category tab counts, the filtered, searched, sorted and paginated document list
 * and the recent activity feed. The Expiring Soon status is derived from each
 * document's expiry against a window, taking precedence over the stored review
 * status for display.
 */
@Injectable()
export class GetRecipientDocumentsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_DOCUMENT_READ_MODEL) private readonly readModel: RecipientDocumentReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetRecipientDocumentsQuery): Promise<RecipientDocumentsResult> {
    if ((await this.recipients.findById(query.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const expiringCutoff = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * MS_PER_DAY);

    const filter: DocumentFilter = {
      recipientId: query.recipientId,
      category: query.category,
      search: query.search,
      sortField: query.sortField,
      sortDirection: query.sortDirection,
      page: query.page,
      pageSize: query.pageSize,
    };

    const [page, counts, activity] = await Promise.all([
      this.readModel.listPage(filter),
      this.readModel.counts(query.recipientId, expiringCutoff),
      this.readModel.recentActivity(query.recipientId, ACTIVITY_LIMIT),
    ]);

    const totalPages = query.pageSize > 0 ? Math.ceil(page.total / query.pageSize) : 0;

    return {
      summary: {
        totalDocuments: counts.total,
        pendingReview: counts.pendingReview,
        expiringSoon: counts.expiringSoon,
        lastUploadAt: counts.lastUploadAt,
      },
      all: counts.total,
      categories: ALL_DOCUMENT_CATEGORIES.map((category) => ({
        category: String(category),
        count: counts.byCategory.get(category) ?? 0,
      })),
      page: {
        items: page.rows.map((row) => this.toItem(row, expiringCutoff)),
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages,
      },
      activity: activity.map((a) => ({
        documentName: a.documentName,
        uploadedByName: a.uploadedByName,
        at: a.at,
      })),
    };
  }

  private toItem(row: DocumentRowView, expiringCutoff: Date): DocumentItemResult {
    const expiringSoon =
      row.expiresAt !== null && row.expiresAt.getTime() <= expiringCutoff.getTime();
    return {
      id: row.id,
      name: row.name,
      category: String(row.category),
      uploadedAt: row.uploadedAt,
      uploadedByName: row.uploadedByName,
      displayStatus: expiringSoon ? DISPLAY_EXPIRING_SOON : String(row.status),
      sizeBytes: row.sizeBytes,
      expiresAt: row.expiresAt,
    };
  }
}
