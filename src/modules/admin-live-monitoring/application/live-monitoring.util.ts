import { AlertSeverity } from '@modules/admin-alerts/domain/alert-severity.enum';
import { AlertType } from '@modules/admin-alerts/domain/alert-type.enum';
import { LiveAlertRow, LiveSnapshot, LiveVisitRow } from './ports/live-monitoring-read.port';
import {
  LiveActiveVisitResult,
  LiveActivityResult,
  LiveAttentionResult,
  LiveMapResult,
  LiveSummaryResult,
} from './dto/live-monitoring.result';

/** One condition the detection sweep should raise as an operational alert. */
export interface LiveAlertCondition {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  relatedVisitId: string;
  relatedCaregiverId: string | null;
  relatedCareRecipientId: string;
}

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
  attention: LiveAttentionResult[],
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
    attentionRequired: attention.length,
    criticalAlerts: attention.filter((a) => a.priority === 'CRITICAL').length,
  };
}

/**
 * The conditions that should be raised as operational alerts for the day's visits:
 * a late check-in, a missed check-in, an overdue visit, or a failed location check
 * (an active visit with no recent caregiver location).
 */
export function detectConditions(
  visits: LiveVisitRow[],
  snapshot: LiveSnapshot,
  now: Date,
): LiveAlertCondition[] {
  const nowMinute = minuteOfUtcDay(now);
  const located = new Set(snapshot.caregiverLocations.map((l) => l.caregiverId));
  const conditions: LiveAlertCondition[] = [];

  for (const v of visits) {
    if (v.status === 'SCHEDULED' && v.clockInAt === null) {
      const lateBy = nowMinute - v.startMinute;
      if (lateBy >= MISSED_THRESHOLD_MINUTES) {
        conditions.push(
          condition(
            v,
            AlertType.MissedClockIn,
            AlertSeverity.High,
            'Missed check-in',
            `Scheduled visit caregiver check-in is overdue by ${lateBy} minutes`,
          ),
        );
      } else if (lateBy >= LATE_THRESHOLD_MINUTES) {
        conditions.push(
          condition(
            v,
            AlertType.LateCaregiver,
            AlertSeverity.Medium,
            'Late check-in',
            `Caregiver check-in is ${lateBy} minutes late`,
          ),
        );
      }
    }
    if (isActive(v)) {
      const overBy = nowMinute - v.endMinute;
      if (overBy >= OVERDUE_THRESHOLD_MINUTES) {
        conditions.push(
          condition(
            v,
            AlertType.VisitOverdue,
            AlertSeverity.High,
            'Visit overdue',
            `Scheduled service duration has exceeded boundary by ${overBy} minutes`,
          ),
        );
      }
      if (v.caregiverId !== null && !located.has(v.caregiverId)) {
        conditions.push(
          condition(
            v,
            AlertType.LocationVerificationFailed,
            AlertSeverity.Medium,
            'Location verification failed',
            'No GPS lock for the active visit',
          ),
        );
      }
    }
  }
  return conditions;
}

/** Build the Attention Required list from the active SOS alerts and the open alerts. */
export function buildAttention(
  snapshot: LiveSnapshot,
  alerts: LiveAlertRow[],
  now: Date,
): LiveAttentionResult[] {
  const nowMinute = minuteOfUtcDay(now);
  const visitById = new Map(snapshot.visits.map((v) => [v.id, v]));
  const items: LiveAttentionResult[] = [];

  for (const sos of snapshot.sosAlerts) {
    items.push({
      id: sos.id,
      source: 'SOS',
      issueType: 'Caregiver SOS Alert',
      description:
        sos.dispatchedAt === null
          ? 'Panic button triggered during an active care visit'
          : 'Panic button triggered; emergency response dispatched',
      priority: 'CRITICAL',
      timeLabel: ageLabel(sos.createdAt, now),
      recipientName: sos.recipientName,
      caregiverName: sos.caregiverName,
      visitId: sos.visitId,
      primaryAction: 'ESCALATE',
      secondaryAction: 'VIEW_VISIT',
    });
  }

  for (const alert of alerts) {
    const visit = alert.relatedVisitId === null ? undefined : visitById.get(alert.relatedVisitId);
    const actions = ACTIONS_BY_TYPE[alert.type] ?? {
      primary: 'VIEW_VISIT',
      secondary: 'ACKNOWLEDGE',
    };
    items.push({
      id: alert.id,
      source: 'ALERT',
      issueType: ISSUE_TYPE[alert.type] ?? alert.title,
      description: alert.description,
      priority: PRIORITY_BY_TYPE[alert.type] ?? 'MEDIUM',
      timeLabel: alertTimeLabel(alert, visit, nowMinute, now),
      recipientName: alert.recipientName,
      caregiverName: alert.caregiverName,
      visitId: alert.relatedVisitId,
      primaryAction: actions.primary,
      secondaryAction: actions.secondary,
    });
  }

  const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
  return items.sort((a, b) => (rank[b.priority] ?? 0) - (rank[a.priority] ?? 0));
}

function condition(
  v: LiveVisitRow,
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  description: string,
): LiveAlertCondition {
  return {
    type,
    severity,
    title,
    description,
    relatedVisitId: v.id,
    relatedCaregiverId: v.caregiverId,
    relatedCareRecipientId: v.careRecipientId,
  };
}

const ISSUE_TYPE: Record<string, string> = {
  LATE_CAREGIVER: 'Late Check-in',
  MISSED_CLOCK_IN: 'Missed Check-in',
  VISIT_OVERDUE: 'Visit Overdue',
  LOCATION_VERIFICATION_FAILED: 'Location Verification Failed',
  CERTIFICATION_EXPIRING: 'Certification Expiring',
  MEDICATION_ISSUE: 'Medication Issue',
  GENERAL: 'Alert',
};
const PRIORITY_BY_TYPE: Record<string, string> = {
  LATE_CAREGIVER: 'MEDIUM',
  MISSED_CLOCK_IN: 'HIGH',
  VISIT_OVERDUE: 'HIGH',
  LOCATION_VERIFICATION_FAILED: 'MEDIUM',
  CERTIFICATION_EXPIRING: 'MEDIUM',
  MEDICATION_ISSUE: 'HIGH',
  GENERAL: 'MEDIUM',
};
const ACTIONS_BY_TYPE: Record<string, { primary: string; secondary: string }> = {
  LATE_CAREGIVER: { primary: 'VIEW_VISIT', secondary: 'ACKNOWLEDGE' },
  MISSED_CLOCK_IN: { primary: 'CONTACT_CAREGIVER', secondary: 'ACKNOWLEDGE' },
  VISIT_OVERDUE: { primary: 'CONTACT_FAMILY', secondary: 'ACKNOWLEDGE' },
  LOCATION_VERIFICATION_FAILED: { primary: 'RESOLVE', secondary: 'CONTACT_CAREGIVER' },
  CERTIFICATION_EXPIRING: { primary: 'VIEW', secondary: 'ACKNOWLEDGE' },
  MEDICATION_ISSUE: { primary: 'CONTACT_CAREGIVER', secondary: 'ACKNOWLEDGE' },
  GENERAL: { primary: 'VIEW', secondary: 'ACKNOWLEDGE' },
};

function alertTimeLabel(
  alert: LiveAlertRow,
  visit: LiveVisitRow | undefined,
  nowMinute: number,
  now: Date,
): string {
  if (visit !== undefined) {
    if (alert.type === 'MISSED_CLOCK_IN') {
      return `Overdue ${nowMinute - visit.startMinute}m`;
    }
    if (alert.type === 'LATE_CAREGIVER') {
      return `Late ${nowMinute - visit.startMinute}m`;
    }
    if (alert.type === 'VISIT_OVERDUE') {
      return `Exceeded ${nowMinute - visit.endMinute}m`;
    }
    if (alert.type === 'LOCATION_VERIFICATION_FAILED') {
      return 'No GPS Lock';
    }
  }
  return ageLabel(alert.createdAt, now);
}

function ageLabel(from: Date, now: Date): string {
  const mins = Math.max(0, Math.floor((now.getTime() - from.getTime()) / MINUTE_MS));
  return mins < 1 ? 'Just now' : `${mins} min ago`;
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
