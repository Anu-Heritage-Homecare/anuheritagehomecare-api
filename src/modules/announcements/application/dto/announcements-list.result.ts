export interface AnnouncementListItemResult {
  id: string;
  title: string;
  audienceLabels: string[];
  statusLabel: string;
  dateLabel: string;
  authorName: string | null;
  authorPhotoKey: string | null;
}

export interface AnnouncementListResult {
  counts: {
    draft: number;
    scheduled: number;
    published: number;
    archived: number;
  };
  announcements: AnnouncementListItemResult[];
}
