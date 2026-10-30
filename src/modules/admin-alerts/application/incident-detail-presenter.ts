import { AlertSeverity } from '../domain/alert-severity.enum';
import { IncidentStatus } from '../domain/incident-status.enum';
import { clockLabel } from './emergency-presenter';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// shortcut: single market reference prefix, matching the incident reference; thread
// the recipient's market through when visits span more than Nigeria.
const MARKET_CODE = 'NG';

/** "Jul 18 2026" from a date (UTC). */
export function dateLabel(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()} ${date.getUTCFullYear()}`;
}

/** "4:32 PM, Jul 18 2026" from a date (UTC). */
export function dateTimeLabel(date: Date): string {
  return `${clockLabel(date)}, ${dateLabel(date)}`;
}

/** Relative day of `date` against `now` (UTC): "Today", "Yesterday" or a date. */
export function dayLabel(date: Date, now: Date): string {
  const startOfDay = (d: Date): number =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return dateLabel(date);
}

/** The visit reference, e.g. "VIS-NG-2026-00872", from its sequence and date. */
export function visitReference(sequence: number, scheduledDate: Date): string {
  return `VIS-${MARKET_CODE}-${scheduledDate.getUTCFullYear()}-${String(sequence).padStart(5, '0')}`;
}

/** "Jul 18 2026, 4:00 PM to 8:00 PM" from the scheduled date and minute window. */
export function scheduleLabel(scheduledDate: Date, startMinute: number, endMinute: number): string {
  return `${dateLabel(scheduledDate)}, ${minuteClock(startMinute)} to ${minuteClock(endMinute)}`;
}

/** Whole years between a date of birth and now (UTC). */
export function ageInYears(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Title case a snake_case value, e.g. PERSONAL_CARE -> Personal Care. */
export function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function severityPriorityLabel(severity: AlertSeverity): string {
  return `${titleCase(severity)} Priority`;
}

export function incidentStatusLabel(status: IncidentStatus): string {
  switch (status) {
    case IncidentStatus.Open:
      return 'Open';
    case IncidentStatus.UnderReview:
      return 'Under Review';
    case IncidentStatus.Resolved:
      return 'Resolved';
    default:
      return 'Closed';
  }
}

/** A clock label from minutes after midnight, e.g. 960 -> "4:00 PM". */
function minuteClock(minute: number): string {
  const hours24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}
