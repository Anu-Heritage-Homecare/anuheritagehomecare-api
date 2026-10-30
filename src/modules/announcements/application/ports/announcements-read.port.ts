export type AnnouncementTab = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface AnnouncementCounts {
  draft: number;
  scheduled: number;
  published: number;
  archived: number;
}

export interface AnnouncementListRow {
  id: string;
  title: string;
  audiences: string[];
  priority: string;
  status: string;
  authorName: string | null;
  authorPhotoKey: string | null;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnouncementListRead {
  counts: AnnouncementCounts;
  rows: AnnouncementListRow[];
}

export interface AnnouncementDetailRow extends AnnouncementListRow {
  body: string;
}

/**
 * Read model for the announcements screens. Resolves the author name and avatar
 * and the per tab counts, querying the admin users table directly (the
 * established read model pattern).
 */
export interface AnnouncementsReadModel {
  list(tab: AnnouncementTab): Promise<AnnouncementListRead>;
  getById(id: string): Promise<AnnouncementDetailRow | null>;
}

export const ANNOUNCEMENTS_READ_MODEL = Symbol('ANNOUNCEMENTS_READ_MODEL');
