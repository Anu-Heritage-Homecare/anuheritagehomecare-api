const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Humanise a SCREAMING_SNAKE enum, e.g. "ALL_STAFF" -> "All Staff", "DRAFT" -> "Draft". */
export function humanLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/** A calendar date for the list, e.g. "Jul 05, 2026". */
export function dateLabel(date: Date): string {
  const month = MONTHS[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month} ${day}, ${date.getUTCFullYear()}`;
}

/**
 * The DATE column label, verbed by the lifecycle state: "Published Jul 15, 2026",
 * "Scheduled Jul 20, 2026", "Archived ...", or "Updated ..." for a draft.
 */
export function timelineLabel(row: {
  status: string;
  publishedAt: Date | null;
  scheduledFor: Date | null;
  archivedAt: Date | null;
  updatedAt: Date;
}): string {
  switch (row.status) {
    case 'PUBLISHED':
      return `Published ${dateLabel(row.publishedAt ?? row.updatedAt)}`;
    case 'SCHEDULED':
      return `Scheduled ${dateLabel(row.scheduledFor ?? row.updatedAt)}`;
    case 'ARCHIVED':
      return `Archived ${dateLabel(row.archivedAt ?? row.updatedAt)}`;
    default:
      return `Updated ${dateLabel(row.updatedAt)}`;
  }
}
