export interface AnnouncementDetailResult {
  id: string;
  title: string;
  body: string;
  audienceLabels: string[];
  priorityLabel: string;
  statusLabel: string;
  dateLabel: string;
  authorName: string | null;
  authorPhotoKey: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}
