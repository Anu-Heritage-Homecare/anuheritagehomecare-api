import { Clock } from '@shared/application/ports/clock.port';
import {
  LiveAlertRow,
  LiveMonitoringReadModel,
  LiveSnapshot,
  LiveVisitRow,
} from '../ports/live-monitoring-read.port';
import { GetLiveOverviewUseCase } from './get-live-overview.use-case';
import { ListActiveVisitsUseCase, ListAttentionUseCase } from './live-monitoring-tabs.use-case';
import { SweepLiveAlertsUseCase } from './sweep-live-alerts.use-case';

const NOW = new Date('2026-07-24T16:45:00.000Z'); // 16:45 UTC -> minute 1005
const clock: Clock = { now: () => NOW };
/** A no-op sweep; the open alerts are supplied directly by the fake read model. */
const sweep = { execute: () => Promise.resolve() } as unknown as SweepLiveAlertsUseCase;

function visit(over: Partial<LiveVisitRow> & { id: string }): LiveVisitRow {
  return {
    status: 'SCHEDULED',
    caregiverId: 'cg',
    careRecipientId: 'r',
    startMinute: 600,
    endMinute: 720,
    visitType: 'PERSONAL_CARE',
    priority: 'NORMAL',
    clockInAt: null,
    clockOutAt: null,
    recipientName: 'Recipient',
    caregiverName: 'Caregiver',
    caregiverBranch: 'West',
    recipientLatitude: null,
    recipientLongitude: null,
    medications: [],
    vitals: [],
    ...over,
  };
}

function snapshot(): LiveSnapshot {
  return {
    visits: [
      visit({
        id: 'v-chioma',
        status: 'IN_PROGRESS',
        caregiverId: 'cg-blessing',
        caregiverName: 'Blessing Okon',
        recipientName: 'Mrs. Chioma Obi',
        visitType: 'COMPANIONSHIP',
        startMinute: 960,
        endMinute: 1140,
        clockInAt: new Date('2026-07-24T16:15:00.000Z'), // 30m elapsed
        vitals: [
          {
            recordedAt: new Date('2026-07-24T16:05:00.000Z'),
            systolic: 135,
            diastolic: 85,
            heartRate: null,
          },
        ],
      }),
      visit({
        id: 'v-okafor',
        status: 'IN_PROGRESS',
        caregiverId: 'cg-david',
        caregiverName: 'David Eze',
        caregiverBranch: 'East',
        recipientName: 'Mr. Chinedu Okafor',
        visitType: 'WOUND_CARE',
        startMinute: 780,
        endMinute: 960, // ended at 16:00, overBy 45
        clockInAt: new Date('2026-07-24T13:00:00.000Z'),
      }),
      visit({ id: 'v-yusuf', startMinute: 970 }), // lateBy 35
      visit({ id: 'v-late', startMinute: 990 }), // lateBy 15 -> running late
      visit({ id: 'v-due', startMinute: 1000 }), // lateBy 5 -> check-in due
      visit({
        id: 'v-done',
        status: 'COMPLETED',
        caregiverId: 'cg-blessing',
        clockInAt: new Date('2026-07-24T13:15:00.000Z'),
        clockOutAt: new Date('2026-07-24T16:15:00.000Z'),
      }),
    ],
    sosAlerts: [
      {
        id: 'sos1',
        visitId: 'v-sos',
        caregiverId: 'cg-amina',
        caregiverName: 'Amina Bello',
        recipientName: 'Mrs. Funmilayo Adebayo',
        recipientAddress: null,
        latitude: null,
        longitude: null,
        createdAt: new Date('2026-07-24T16:43:00.000Z'), // 2 min ago
        dispatchedAt: null,
      },
    ],
    caregiverLocations: [],
  };
}

function openAlerts(): LiveAlertRow[] {
  return [
    {
      id: 'a-missed',
      type: 'MISSED_CLOCK_IN',
      severity: 'HIGH',
      title: 'Missed check-in',
      description: 'Scheduled visit caregiver check-in is overdue by 35 minutes',
      relatedVisitId: 'v-yusuf',
      relatedCaregiverId: 'cg-joy',
      relatedCareRecipientId: 'r-yusuf',
      recipientName: 'Alhaji Samuel Yusuf',
      caregiverName: 'Joy Idowu',
      createdAt: new Date('2026-07-24T16:40:00.000Z'),
    },
    {
      id: 'a-overdue',
      type: 'VISIT_OVERDUE',
      severity: 'HIGH',
      title: 'Visit overdue',
      description: 'Scheduled service duration has exceeded boundary by 45 minutes',
      relatedVisitId: 'v-okafor',
      relatedCaregiverId: 'cg-david',
      relatedCareRecipientId: 'r-okafor',
      recipientName: 'Mr. Chinedu Okafor',
      caregiverName: 'David Eze',
      createdAt: new Date('2026-07-24T16:20:00.000Z'),
    },
  ];
}

function reads(snap: LiveSnapshot, alerts: LiveAlertRow[]): LiveMonitoringReadModel {
  return {
    snapshot: () => Promise.resolve(snap),
    openAlerts: () => Promise.resolve(alerts),
  };
}

const NO_FILTERS = { branch: null, serviceType: null };

describe('GetLiveOverviewUseCase', () => {
  it('derives the six KPIs from the snapshot and the open alerts', async () => {
    const result = await new GetLiveOverviewUseCase(
      reads(snapshot(), openAlerts()),
      sweep,
      clock,
    ).execute(NO_FILTERS);
    expect(result.summary).toEqual({
      activeVisits: 2,
      caregiversCheckedIn: 2,
      checkInDue: 1,
      runningLate: 1,
      attentionRequired: 3, // 1 SOS + 2 open alerts
      criticalAlerts: 1, // the SOS
    });
  });

  it('builds the active visit summary, attention panel and activity feed', async () => {
    const result = await new GetLiveOverviewUseCase(
      reads(snapshot(), openAlerts()),
      sweep,
      clock,
    ).execute(NO_FILTERS);

    const chioma = result.activeVisits.find((v) => v.visitId === 'v-chioma');
    expect(chioma?.service).toBe('Companionship');
    expect(chioma?.elapsedLabel).toBe('30m elapsed');

    expect(result.attentionRequired[0].source).toBe('SOS');
    expect(result.attentionRequired[0].priority).toBe('CRITICAL');
    expect(result.attentionRequired[0].timeLabel).toBe('2 min ago');

    const byType = new Map(result.attentionRequired.map((a) => [a.issueType, a]));
    expect(byType.get('Missed Check-in')?.timeLabel).toBe('Overdue 35m');
    expect(byType.get('Missed Check-in')?.priority).toBe('HIGH');
    expect(byType.get('Visit Overdue')?.timeLabel).toBe('Exceeded 45m');

    const vitals = result.recentActivity.find((a) => a.type === 'VITALS');
    expect(vitals?.description).toContain('135/85');
  });
});

describe('Live Monitoring tabs', () => {
  it('filters active visits by service type', async () => {
    const result = await new ListActiveVisitsUseCase(reads(snapshot(), []), clock).execute({
      branch: null,
      serviceType: 'COMPANIONSHIP',
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    expect(result.rows[0].visitId).toBe('v-chioma');
  });

  it('lists the attention items (SOS plus open alerts)', async () => {
    const result = await new ListAttentionUseCase(
      reads(snapshot(), openAlerts()),
      sweep,
      clock,
    ).execute();
    expect(result).toHaveLength(3);
    expect(result.map((a) => a.priority)).toEqual(['CRITICAL', 'HIGH', 'HIGH']);
  });
});
