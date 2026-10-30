const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

// shortcut: clock labels are rendered in UTC; thread the branch timezone through
// when emergencies span timezones.
/** A clock label for a timestamp, e.g. "4:32 PM". */
export function clockLabel(date: Date): string {
  const hours24 = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Elapsed time between two instants as a human label, e.g. "8 minutes". */
export function durationLabel(from: Date, to: Date): string {
  const diff = Math.max(0, to.getTime() - from.getTime());
  const hours = Math.floor(diff / HOUR_MS);
  const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);
  if (hours === 0) {
    return `${minutes} ${plural(minutes, 'minute')}`;
  }
  if (minutes === 0) {
    return `${hours} ${plural(hours, 'hour')}`;
  }
  return `${hours} ${plural(hours, 'hour')} ${minutes} ${plural(minutes, 'minute')}`;
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
