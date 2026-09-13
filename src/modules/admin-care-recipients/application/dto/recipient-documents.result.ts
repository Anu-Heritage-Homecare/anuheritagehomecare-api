export interface DocumentsSummaryResult {
  totalDocuments: number;
  pendingReview: number;
  expiringSoon: number;
  lastUploadAt: Date | null;
}

export interface DocumentCategoryCountResult {
  category: string;
  count: number;
}

export interface DocumentItemResult {
  id: string;
  name: string;
  category: string;
  uploadedAt: Date;
  uploadedByName: string | null;
  /** Derived: Expiring Soon takes precedence over the stored review status. */
  displayStatus: string;
  sizeBytes: number;
  expiresAt: Date | null;
}

export interface DocumentsPageResult {
  items: DocumentItemResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DocumentActivityResult {
  documentName: string;
  uploadedByName: string | null;
  at: Date;
}

export interface RecipientDocumentsResult {
  summary: DocumentsSummaryResult;
  /** The count for every category (zero when none), plus the All total. */
  all: number;
  categories: DocumentCategoryCountResult[];
  page: DocumentsPageResult;
  activity: DocumentActivityResult[];
}
