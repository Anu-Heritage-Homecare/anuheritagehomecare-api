/**
 * Minimal RFC 5545 iCalendar builder for the read only care schedule feed. Times
 * are emitted as floating local time (no timezone), matching the app's timezone
 * free scheduling: a calendar shows each visit at its wall clock time.
 */

export interface IcsEvent {
  uid: string;
  /** Floating local start, formatted YYYYMMDDTHHMMSS. */
  start: string;
  end: string;
  summary: string;
  status: 'CONFIRMED' | 'CANCELLED';
}

const CRLF = '\r\n';

/** Escape text per RFC 5545 (commas, semicolons, backslashes and newlines). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Format a Date as a floating local timestamp (YYYYMMDDTHHMMSS), no timezone. */
export function toFloatingLocal(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

/** Format a Date as a UTC timestamp (YYYYMMDDTHHMMSSZ) for DTSTAMP. */
export function toUtcStamp(date: Date): string {
  return `${toFloatingLocal(date)}Z`;
}

/** Build a complete VCALENDAR document from the events. */
export function buildIcs(params: {
  calendarName: string;
  dtstamp: Date;
  events: IcsEvent[];
}): string {
  const stamp = toUtcStamp(params.dtstamp);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anu Heritage Homecare//Care Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(params.calendarName)}`,
  ];
  for (const event of params.events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${event.start}`,
      `DTEND:${event.end}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `STATUS:${event.status}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join(CRLF) + CRLF;
}
