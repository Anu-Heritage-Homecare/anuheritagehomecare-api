import { DocumentCategory } from '@modules/care-recipients/domain/document-category.enum';
import { DocumentStatus } from '@modules/care-recipients/domain/document-status.enum';

export type DocumentSortField = 'DATE' | 'NAME' | 'SIZE';

export interface DocumentFilter {
  recipientId: string;
  category: DocumentCategory | null;
  search: string | null;
  sortField: DocumentSortField;
  sortDirection: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

export interface DocumentRowView {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadedAt: Date;
  uploadedByName: string | null;
  status: DocumentStatus;
  sizeBytes: number;
  expiresAt: Date | null;
}

export interface DocumentPageView {
  rows: DocumentRowView[];
  total: number;
}

export interface DocumentCountsView {
  total: number;
  byCategory: Map<DocumentCategory, number>;
  pendingReview: number;
  expiringSoon: number;
  lastUploadAt: Date | null;
}

export interface DocumentActivityView {
  documentName: string;
  uploadedByName: string | null;
  at: Date;
}

/**
 * Read model for the recipient Documents screen. A dedicated query model (not the
 * domain repository) because it serves a filtered, searched, sorted and paginated
 * list plus the category and summary counts and the recent activity feed.
 */
export interface RecipientDocumentReadModel {
  listPage(filter: DocumentFilter): Promise<DocumentPageView>;
  counts(recipientId: string, expiringCutoff: Date): Promise<DocumentCountsView>;
  recentActivity(recipientId: string, limit: number): Promise<DocumentActivityView[]>;
}

export const RECIPIENT_DOCUMENT_READ_MODEL = Symbol('RECIPIENT_DOCUMENT_READ_MODEL');
