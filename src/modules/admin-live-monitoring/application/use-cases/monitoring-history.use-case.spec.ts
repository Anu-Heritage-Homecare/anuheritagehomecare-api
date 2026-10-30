import { Clock } from '@shared/application/ports/clock.port';
import {
  CompletedVisitRow,
  MonitoringHistoryReadModel,
  PastAlertRow,
  PastIncidentRow,
} from '../ports/monitoring-history-read.port';
import {
  GetCompletedVisitsUseCase,
  GetPastAlertsUseCase,
  GetPastIncidentsUseCase,
} from './monitoring-history.use-case';

const NOW = new Date('2026-10-12T20:00:00.000Z');
const clock: Clock = { now: () => NOW };

// Scheduled 09:00 (540). On-time clocks in 09:02; late clocks in 09:40.
function visit(id: string, seq: number, clockInMinute: number): CompletedVisitRow {
  const day = new Date('2026-10-12T00:00:00.000Z');
  return {
    id,
    sequence: seq,
    scheduledDate: day,
    startMinute: 540,
    endMinute: 665, // 2h05m scheduled
    clockInAt: new Date(day.getTime() + clockInMinute * 60_000),
    clockOutAt: new Date(day.getTime() + (clockInMinute + 125) * 60_000),
    recipientName: 'Mrs. Funmilayo Adebayo',
    caregiverName: 'Amina Bello',
    caregiverBranch: 'Lagos Mainland',
  };
}

function reads(
  visits: CompletedVisitRow[] = [],
  alerts: PastAlertRow[] = [],
  incidents: PastIncidentRow[] = [],
): MonitoringHistoryReadModel {
  return {
    completedVisits: () => Promise.resolve(visits),
    pastAlerts: () => Promise.resolve(alerts),
    pastIncidents: () => Promise.resolve(incidents),
  };
}

describe('GetCompletedVisitsUseCase', () => {
  it('derives duration and the on-time or late status, and paginates', async () => {
    const result = await new GetCompletedVisitsUseCase(
      reads([visit('v1', 9821, 542), visit('v2', 9820, 580)]),
      clock,
    ).execute({ page: 1, pageSize: 1 });

    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      reference: 'CP-9821',
      durationLabel: '2h 05m',
      status: 'COMPLETED',
      statusLabel: 'Completed',
    });
  });

  it('filters to Completed Late only', async () => {
    const result = await new GetCompletedVisitsUseCase(
      reads([visit('v1', 9821, 542), visit('v2', 9820, 580)]),
      clock,
    ).execute({ status: 'COMPLETED_LATE' });

    expect(result.rows.map((r) => r.reference)).toEqual(['CP-9820']);
    expect(result.rows[0].statusLabel).toBe('Completed Late');
  });
});

describe('GetPastAlertsUseCase', () => {
  it('maps resolved alerts with a source and a resolved-ago label', async () => {
    const alert: PastAlertRow = {
      id: 'a1',
      type: 'MISSED_CLOCK_IN',
      severity: 'HIGH',
      status: 'RESOLVED',
      description: 'Caregiver missed scheduled check-in',
      createdAt: new Date('2026-10-12T15:00:00.000Z'),
      resolvedAt: new Date('2026-10-12T16:00:00.000Z'), // 4h ago
      resolvedByAdminId: 'admin-1',
      recipientName: 'Joy Idowu',
      caregiverBranch: 'Lagos Mainland',
    };
    const result = await new GetPastAlertsUseCase(reads([], [alert]), clock).execute({});
    expect(result.rows[0]).toMatchObject({
      typeLabel: 'Missed Check-in',
      source: 'Joy Idowu',
      dateLabel: '12 Oct 2026',
      resolution: 'Coordinator resolved',
      statusLabel: 'Resolved',
    });
  });

  it('labels an auto-resolved alert (no admin) distinctly', async () => {
    const alert: PastAlertRow = {
      id: 'a2',
      type: 'LATE_CAREGIVER',
      severity: 'LOW',
      status: 'RESOLVED',
      description: 'Caregiver running late',
      createdAt: new Date('2026-10-12T15:00:00.000Z'),
      resolvedAt: new Date('2026-10-12T16:00:00.000Z'),
      resolvedByAdminId: null,
      recipientName: 'Joy Idowu',
      caregiverBranch: null,
    };
    const result = await new GetPastAlertsUseCase(reads([], [alert]), clock).execute({});
    expect(result.rows[0].resolution).toBe('Auto-resolved');
    expect(result.rows[0].typeLabel).toBe('Late Check-in');
  });
});

describe('GetPastIncidentsUseCase', () => {
  it('maps resolved incidents with a reference and status', async () => {
    const incident: PastIncidentRow = {
      id: 'i1',
      sequence: 124,
      category: 'MEDICATION_CONCERN',
      severity: 'HIGH',
      status: 'CLOSED',
      createdAt: new Date('2026-10-11T10:00:00.000Z'),
      resolvedAt: new Date('2026-10-12T10:00:00.000Z'),
      resolvedByAdminId: 'admin-1',
      reporterName: null,
      recipientName: 'Mrs. Chioma Obi',
    };
    const result = await new GetPastIncidentsUseCase(reads([], [], [incident]), clock).execute({});
    expect(result.rows[0]).toMatchObject({
      reference: 'INC-NG-2026-00124',
      categoryLabel: 'Medication Concern',
      reporter: 'Mrs. Chioma Obi', // falls back to the recipient when no reporter
      dateLabel: '11 Oct 2026',
      outcome: 'Closed',
    });
  });
});
