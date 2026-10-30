const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/** A short relative label for the inbox, e.g. "2m ago", "1h ago", "Yesterday", "Jul 20". */
export function timeAgoLabel(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const dayDiff = Math.round((startOfUtcDay(now) - startOfUtcDay(date)) / 86_400_000);
  if (dayDiff === 0) {
    return `${Math.floor(minutes / 60)}h ago`;
  }
  if (dayDiff === 1) {
    return 'Yesterday';
  }
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** The clock time shown on a message bubble, e.g. "10:15 AM". */
export function clockTimeLabel(date: Date): string {
  const hours24 = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** The full upload timestamp on the File Preview, e.g. "Jul 18, 2026, 2:39 PM". */
export function dateTimeLabel(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${clockTimeLabel(date)}`;
}

/** A human file size, e.g. 421888 -> "412 KB", 1258291 -> "1.2 MB". */
export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Caregiver',
  FAMILY_MEMBER: 'Family',
};

/** The badge label for a conversation row (Caregiver, Family, Visit, Team, Announcement). */
export function conversationRoleLabel(
  kind: string,
  counterpartyRole: string | null,
): string | null {
  switch (kind) {
    case 'VISIT':
      return 'Visit';
    case 'TEAM':
      return 'Team';
    case 'ANNOUNCEMENT':
      return 'Announcement';
    default:
      return counterpartyRole === null ? null : (ROLE_LABELS[counterpartyRole] ?? counterpartyRole);
  }
}

/** Humanise a SCREAMING_SNAKE enum, e.g. "MORNING_CARE" -> "Morning Care", "ACTIVE" -> "Active". */
export function humanLabel(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/** The clock time for a minute of the day, e.g. 495 -> "8:15 AM". */
export function minuteClockLabel(minute: number): string {
  const hours24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

const MAX_PREVIEW_LENGTH = 90;

/** A single line preview of the last message. */
export function previewLabel(body: string | null): string | null {
  if (body === null) {
    return null;
  }
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_PREVIEW_LENGTH
    ? `${collapsed.slice(0, MAX_PREVIEW_LENGTH)}…`
    : collapsed;
}
