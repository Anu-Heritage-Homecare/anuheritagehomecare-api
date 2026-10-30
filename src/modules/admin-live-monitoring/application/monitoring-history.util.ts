const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// shortcut: a visit is late if clock-in is more than this past the scheduled start;
// tune when the real grace policy is set.
export const LATE_GRACE_MINUTES = 5;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Oct 2026" from a date (UTC). */
export function dayMonthYear(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "N ago" label for a past timestamp. */
export function ago(fromMs: number): string {
  if (fromMs < HOUR_MS) {
    return `${Math.max(1, Math.floor(fromMs / MINUTE_MS))}m ago`;
  }
  if (fromMs < DAY_MS) {
    return `${Math.floor(fromMs / HOUR_MS)}h ago`;
  }
  return `${Math.floor(fromMs / DAY_MS)}d ago`;
}

/** "2h 05m" from a duration in milliseconds. */
export function durationLabel(ms: number): string {
  const total = Math.max(0, ms);
  const hours = Math.floor(total / HOUR_MS);
  const minutes = Math.floor((total % HOUR_MS) / MINUTE_MS);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** The instant a visit was scheduled to start (UTC). */
export function scheduledStartMs(scheduledDate: Date, startMinute: number): number {
  const dayStart = Date.UTC(
    scheduledDate.getUTCFullYear(),
    scheduledDate.getUTCMonth(),
    scheduledDate.getUTCDate(),
  );
  return dayStart + startMinute * MINUTE_MS;
}

/** Whether a completed visit clocked in late (beyond the grace), given its times. */
export function isLate(scheduledDate: Date, startMinute: number, clockInAt: Date | null): boolean {
  if (clockInAt === null) {
    return false;
  }
  const start = scheduledStartMs(scheduledDate, startMinute);
  return clockInAt.getTime() > start + LATE_GRACE_MINUTES * MINUTE_MS;
}

/** One page of an already-filtered list, plus its total and page count. */
export function pageOf<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { slice: T[]; total: number; totalPages: number } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { slice: rows.slice(start, start + pageSize), total, totalPages };
}
