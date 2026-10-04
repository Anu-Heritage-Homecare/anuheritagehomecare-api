import { LiveSnapshot, LiveVisitRow } from './ports/live-monitoring-read.port';
import {
  LiveActiveVisitResult,
  LiveActivityResult,
  LiveAttentionResult,
  LiveMapResult,
  LiveSummaryResult,
} from './dto/live-monitoring.result';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
/** Minutes late before a check-in counts as running late, and then as missed. */
const LATE_THRESHOLD_MINUTES = 10;
const MISSED_THRESHOLD_MINUTES = 30;
/** Minutes past the scheduled end before an in progress visit is overdue. */
const OVERDUE_THRESHOLD_MINUTES = 15;
const ACTIVITY_LIMIT = 8;
const ACTIVE_STATUSES = new Set(['IN_PROGRESS', 'ON_BREAK']);

export interface LiveFilters {
  branch: string | null;
  serviceType: string | null;
}

export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function nextUtcDay(value: Date): Date {
  return new Date(startOfUtcDay(value).getTime() + DAY_MS);
}

function minuteOfUtcDay(value: Date): number {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

export function filterVisits(visits: LiveVisitRow[], filters: LiveFilters): LiveVisitRow[] {
  return visits.filter((v) => {
    if (
      filters.branch !== null &&
      filters.branch !== 'ALL' &&
      v.caregiverBranch !== filters.branch
    ) {
      return false;
    }
    if (filters.serviceType !== null && v.visitType !== filters.serviceType) {
      return false;
    }
    return true;
  });
}

export function isActive(visit: LiveVisitRow): boolean {
  return ACTIVE_STATUSES.has(visit.status);
}

export function computeSummary(
  visits: LiveVisitRow[],
  snapshot: LiveSnapshot,
  now: Date,
): LiveSummaryResult {
  const nowMinute = minuteOfUtcDay(now);
  const scheduledPending = visits.filter((v) => v.status === 'SCHEDULED' && v.clockInAt === null);
  const lateBy = (v: LiveVisitRow): number => nowMinute - v.startMinute;

  const checkedIn = new Set(
    visits.filter((v) => v.clockInAt !== null && v.caregiverId !== null).map((v) => v.caregiverId),
  );

  return {
    activeVisits: visits.filter(isActive).length,
    caregiversCheckedIn: checkedIn.size,
    checkInDue: scheduledPending.filter((v) => lateBy(v) >= 0 && lateBy(v) < LATE_THRESHOLD_MINUTES)
      .length,
    runningLate: scheduledPending.filter(
      (v) => lateBy(v) >= LATE_THRESHOLD_MINUTES && lateBy(v) < MISSED_THRESHOLD_MINUTES,
    ).length,
    attentionRequired: computeAttention(visits, snapshot, now).length,
    criticalAlerts: snapshot.sosAlerts.length,
  };
}

export function computeActiveVisits(visits: LiveVisitRow[], now: Date): LiveActiveVisitResult[] {
  return visits
    .filter(isActive)
    .map((v) => {
      const elapsedMinutes =
        v.clockInAt === null
          ? 0
          : Math.max(0, Math.floor((now.getTime() - v.clockInAt.getTime()) / MINUTE_MS));
      const scheduledMinutes = Math.max(1, v.endMinute - v.startMinute);
      return {
        visitId: v.id,
        recipientName: v.recipientName,
        caregiverName: v.caregiverName,
        service: displayService(v.visitType),
        status: displayStatus(v.status),
        elapsedMinutes,
        elapsedLabel: elapsedLabel(elapsedMinutes),
        progressPercent: Math.min(100, Math.round((elapsedMinutes / scheduledMinutes) * 100)),
      };
    })
    .sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);
}

export function computeAttention(
  visits: LiveVisitRow[],
  snapshot: LiveSnapshot,
  now: Date,
): LiveAttentionResult[] {
  const nowMinute = minuteOfUtcDay(now);
  const items: LiveAttentionResult[] = [];

  for (const sos of snapshot.sosAlerts) {
    items.push({
      id: sos.id,
      kind: 'SOS',
      severity: 'CRITICAL',
      title: 'Caregiver SOS Alert',
      description:
        sos.dispatchedAt === null
          ? 'Panic button triggered during an active care visit'
          : 'Panic button triggered; emergency response dispatched',
      recipientName: sos.recipientName,
      caregiverName: sos.caregiverName,
      visitId: null,
      action: 'EMERGENCY_DISPATCH',
    });
  }

  for (const v of visits) {
    if (v.status === 'SCHEDULED' && v.clockInAt === null) {
      const lateBy = nowMinute - v.startMinute;
      if (lateBy >= MISSED_THRESHOLD_MINUTES) {
        items.push({
          id: v.id,
          kind: 'MISSED_CHECK_IN',
          severity: 'HIGH',
          title: 'Missed check-in',
          description: `Scheduled visit caregiver check-in is overdue by ${lateBy} minutes`,
          recipientName: v.recipientName,
          caregiverName: v.caregiverName,
          visitId: v.id,
          action: 'CONTACT_CAREGIVER',
        });
      }
    }
    if (isActive(v)) {
      const overBy = nowMinute - v.endMinute;
      if (overBy >= OVERDUE_THRESHOLD_MINUTES) {
        items.push({
          id: v.id,
          kind: 'VISIT_OVERDUE',
          severity: 'HIGH',
          title: 'Visit overdue',
          description: `Scheduled service duration has exceeded boundary by ${overBy} minutes`,
          recipientName: v.recipientName,
          caregiverName: v.caregiverName,
          visitId: v.id,
          action: 'REVIEW_VISIT',
        });
      }
    }
  }

  const rank: Record<string, number> = { CRITICAL: 2, HIGH: 1 };
  return items.sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0));
}

export function computeActivity(visits: LiveVisitRow[], _now: Date): LiveActivityResult[] {
  const items: { at: Date; item: Omit<LiveActivityResult, 'timeLabel'> }[] = [];
  const push = (type: string, title: string, description: string, at: Date): void => {
    items.push({ at, item: { type, title, description, at: at.toISOString() } });
  };

  for (const v of visits) {
    const who = v.caregiverName ?? 'A caregiver';
    if (v.clockInAt !== null) {
      push(
        'CHECK_IN',
        `${who} checked in`,
        `Started the care visit for ${v.recipientName}.`,
        v.clockInAt,
      );
    }
    if (v.status === 'COMPLETED' && v.clockOutAt !== null) {
      push(
        'VISIT_COMPLETED',
        'Visit completed',
        `${who} checked out of the visit for ${v.recipientName}.`,
        v.clockOutAt,
      );
    }
    for (const med of v.medications) {
      push(
        'MEDICATION',
        'Medication task completed',
        `${who} recorded medication (${displayOutcome(med.outcome)}) for ${v.recipientName}.`,
        med.recordedAt,
      );
    }
    for (const vitals of v.vitals) {
      push(
        'VITALS',
        'Vitals recorded',
        `${vitalsSummary(vitals)} for ${v.recipientName}.`,
        vitals.recordedAt,
      );
    }
  }

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, ACTIVITY_LIMIT)
    .map((e) => ({ ...e.item, timeLabel: formatClock(e.at) }));
}

export function computeMap(visits: LiveVisitRow[], snapshot: LiveSnapshot): LiveMapResult {
  const locationByCaregiver = new Map(snapshot.caregiverLocations.map((l) => [l.caregiverId, l]));
  return {
    visits: visits.filter(isActive).map((v) => {
      const location = v.caregiverId === null ? undefined : locationByCaregiver.get(v.caregiverId);
      return {
        visitId: v.id,
        recipientName: v.recipientName,
        recipientLatitude: v.recipientLatitude,
        recipientLongitude: v.recipientLongitude,
        caregiverName: v.caregiverName,
        caregiverLatitude: location?.latitude ?? null,
        caregiverLongitude: location?.longitude ?? null,
        status: displayStatus(v.status),
      };
    }),
    sos: snapshot.sosAlerts.map((s) => ({
      id: s.id,
      caregiverName: s.caregiverName,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
  };
}

export function displayStatus(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'ON_BREAK':
      return 'On Break';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'MISSED':
      return 'Missed';
    default:
      return 'Scheduled';
  }
}

export function displayService(visitType: string): string {
  return visitType
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function displayOutcome(outcome: string): string {
  return outcome.charAt(0) + outcome.slice(1).toLowerCase().replace(/_/g, ' ');
}

function vitalsSummary(vitals: {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
}): string {
  const parts: string[] = [];
  if (vitals.systolic !== null && vitals.diastolic !== null) {
    parts.push(`Blood pressure logged at ${vitals.systolic}/${vitals.diastolic} mmHg`);
  }
  if (vitals.heartRate !== null) {
    parts.push(`HR ${vitals.heartRate}`);
  }
  return parts.length === 0 ? 'Vitals recorded' : parts.join(', ');
}

function elapsedLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m elapsed`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h elapsed` : `${hours}h ${rest}m elapsed`;
}

function formatClock(value: Date): string {
  const minute = value.getUTCHours() * 60 + value.getUTCMinutes();
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}
