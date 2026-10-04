import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { HolidayPolicy } from '../domain/holiday-policy.enum';
import { SchedulingSettings } from '../domain/scheduling-settings.entity';
import { SchedulingHolidayData } from '../domain/scheduling-settings.repository';
import { formatMinute } from './scheduling-view.util';

/** The weekday a UTC date falls on, indexed by Date.getUTCDay() (0 = Sunday). */
const WEEKDAY_BY_UTC_DAY: Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
];
/** Priorities that count as an emergency, allowed on emergency only holidays. */
const EMERGENCY_PRIORITIES = new Set(['URGENT', 'CRITICAL']);

/** The credential a service type requires, matched against certifications by name. */
const REQUIRED_CERTIFICATION: Record<string, string | null> = {
  WOUND_CARE: 'Wound Care',
  MEDICATION: 'Medication',
  PHYSICAL_THERAPY: 'Physical Therapy',
  PERSONAL_CARE: null,
  MORNING_CARE: null,
  COMPANIONSHIP: null,
};

/** The credential a service type requires, or null when it needs none. */
export function requiredCertificationFor(visitType: string): string | null {
  return REQUIRED_CERTIFICATION[visitType] ?? null;
}

/** Fallback default duration (minutes) for a service type with none saved. */
const FALLBACK_DURATIONS: Record<string, number> = {
  PERSONAL_CARE: 60,
  MORNING_CARE: 120,
  MEDICATION: 30,
  PHYSICAL_THERAPY: 90,
  WOUND_CARE: 60,
  COMPANIONSHIP: 120,
};

export function fallbackDurationMinutes(visitType: string): number {
  return FALLBACK_DURATIONS[visitType] ?? 60;
}

export function weekdayOf(date: Date): Weekday {
  return WEEKDAY_BY_UTC_DAY[date.getUTCDay()];
}

/**
 * Enforce the business hours and holiday policy for a visit window. Throws a
 * ValidationException when the day is closed, the window falls outside the open
 * hours, or the date is a holiday the priority is not allowed on.
 */
export function assertSchedulable(
  settings: SchedulingSettings,
  holidays: SchedulingHolidayData[],
  scheduledDate: Date,
  startMinute: number,
  endMinute: number,
  priority: string,
): void {
  const day = settings.businessHoursFor(weekdayOf(scheduledDate));
  if (day === undefined || !day.open) {
    throw new ValidationException('The schedule is closed on that day');
  }
  if (startMinute < day.openMinute || endMinute > day.closeMinute) {
    throw new ValidationException(
      `Outside business hours (${formatMinute(day.openMinute)} to ${formatMinute(day.closeMinute)})`,
    );
  }

  const holiday = holidays.find((h) => isSameUtcDate(h.date, scheduledDate));
  if (holiday === undefined) {
    return;
  }
  if (holiday.policy === HolidayPolicy.Closed) {
    throw new ValidationException(`No visits are scheduled on ${holiday.name}`);
  }
  if (holiday.policy === HolidayPolicy.EmergencyOnly && !EMERGENCY_PRIORITIES.has(priority)) {
    throw new ValidationException(`Only emergency visits are allowed on ${holiday.name}`);
  }
}

function isSameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
