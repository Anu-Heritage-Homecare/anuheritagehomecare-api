import { NoteCategory } from '@modules/care-notes/domain/note-category.enum';

export interface NoteFilter {
  recipientId: string;
  category: NoteCategory | null;
  search: string | null;
  authorName: string | null;
  page: number;
  pageSize: number;
}

export interface NoteRowView {
  id: string;
  category: NoteCategory;
  content: string;
  authorName: string;
  authorRole: string | null;
  postedAt: Date;
  flaggedForReview: boolean;
  acknowledgedAt: Date | null;
  commentCount: number;
  attachmentCount: number;
}

export interface NotePageView {
  rows: NoteRowView[];
  total: number;
}

export interface NoteCountsView {
  total: number;
  byCategory: Map<NoteCategory, number>;
  thisMonth: number;
  flaggedForReview: number;
}

/**
 * Read model for the admin Notes screen. A dedicated query model (not the domain
 * repository) because it serves a filtered, searched and paginated list, the category
 * and summary counts, and the distinct author list for the author filter.
 */
export interface RecipientNotesReadModel {
  listPage(filter: NoteFilter): Promise<NotePageView>;
  counts(recipientId: string, monthStart: Date): Promise<NoteCountsView>;
  authors(recipientId: string): Promise<string[]>;
}

export const RECIPIENT_NOTES_READ_MODEL = Symbol('RECIPIENT_NOTES_READ_MODEL');
