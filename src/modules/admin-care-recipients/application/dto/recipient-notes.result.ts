export interface NotesSummaryResult {
  totalNotes: number;
  thisMonth: number;
  flaggedForReview: number;
}

export interface NoteCategoryCountResult {
  category: string;
  count: number;
}

export interface NoteItemResult {
  id: string;
  category: string;
  content: string;
  authorName: string;
  authorRole: string | null;
  postedAt: Date;
  flaggedForReview: boolean;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  commentCount: number;
  attachmentCount: number;
}

export interface NotesPageResult {
  items: NoteItemResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecipientNotesResult {
  summary: NotesSummaryResult;
  /** The count for every category (zero when none), plus the All total. */
  all: number;
  categories: NoteCategoryCountResult[];
  /** Distinct author names, for the author filter dropdown. */
  authors: string[];
  page: NotesPageResult;
}
