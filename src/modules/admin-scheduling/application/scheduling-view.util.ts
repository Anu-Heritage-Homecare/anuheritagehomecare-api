import { SchedulingVisitRow } from './ports/scheduling-read.port';
import { SchedulingConflictResult, SchedulingVisitResult } from './dto/scheduling.result';

const DAY_MS = 86_400_000;
/** Statuses that no longer occupy a caregiver's time, so they never conflict. */
const INACTIVE_STATUSES = new Set(['CANCELLED', 'MISSED']);

/** Midnight (UTC) of the day the instant falls on. */
export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** The next day (UTC) after the day the instant falls on. */
export function nextUtcDay(value: Date): Date {
  return new Date(startOfUtcDay(value).getTime() + DAY_MS);
}

/** Format minutes from midnight as a 12 hour time, e.g. 480 -> 8:00 AM. */
export function formatMinute(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** The status label the console shows, distinguishing assigned from unassigned. */
export function displayStatus(status: string, caregiverId: string | null): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'ON_BREAK':
      return 'On Break';
    case 'CANCELLED':
      return 'Cancelled';
    case 'MISSED':
      return 'Missed';
    default:
      return caregiverId === null ? 'Unassigned' : 'Upcoming';
  }
}

/** Title case a visit priority for display, e.g. CRITICAL -> Critical. */
export function displayPriority(priority: string): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

/** Title case a visit type for display, e.g. PERSONAL_CARE -> Personal Care. */
export function displayService(visitType: string): string {
  return visitType
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

/** Map a hydrated row to a console visit result. */
export function toVisitResult(row: SchedulingVisitRow): SchedulingVisitResult {
  return {
    id: row.id,
    date: row.scheduledDate.toISOString(),
    time: formatMinute(row.startMinute),
    endTime: formatMinute(row.endMinute),
    recipientName: row.recipientName,
    caregiverId: row.caregiverId,
    caregiverName: row.caregiverName,
    service: displayService(row.visitType),
    status: displayStatus(row.status, row.caregiverId),
    priority: displayPriority(row.priority),
    assignable: row.caregiverId === null && row.status === 'SCHEDULED',
  };
}

/** Detect overlapping visit pairs for each caregiver on the day. */
export function detectConflicts(rows: SchedulingVisitRow[]): SchedulingConflictResult[] {
  const byCaregiver = new Map<string, SchedulingVisitRow[]>();
  for (const row of rows) {
    if (row.caregiverId === null || INACTIVE_STATUSES.has(row.status)) {
      continue;
    }
    const bucket = byCaregiver.get(row.caregiverId) ?? [];
    bucket.push(row);
    byCaregiver.set(row.caregiverId, bucket);
  }

  const conflicts: SchedulingConflictResult[] = [];
  for (const [caregiverId, visits] of byCaregiver) {
    const sorted = [...visits].sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i];
        const b = sorted[j];
        if (b.startMinute >= a.endMinute) {
          break; // sorted by start, so no later visit can overlap a either
        }
        conflicts.push({
          caregiverId,
          caregiverName: a.caregiverName,
          first: toVisitResult(a),
          second: toVisitResult(b),
        });
      }
    }
  }
  return conflicts;
}
