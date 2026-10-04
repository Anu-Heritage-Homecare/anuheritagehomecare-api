import { Clock } from '@shared/application/ports/clock.port';
import {
  LiveMonitoringReadModel,
  LiveSnapshot,
  LiveVisitRow,
} from '../ports/live-monitoring-read.port';
import { GetLiveOverviewUseCase } from './get-live-overview.use-case';
import { ListActiveVisitsUseCase, ListAttentionUseCase } from './live-monitoring-tabs.use-case';

const NOW = new Date('2026-07-24T16:45:00.000Z'); // 16:45 UTC -> minute 1005
const clock: Clock = { now: () => NOW };

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
        medications: [
          { recordedAt: new Date('2026-07-24T16:28:00.000Z'), outcome: 'ADMINISTERED' },
        ],
      }),
      visit({
        id: 'v-yusuf',
        caregiverName: 'Joy Idowu',
        recipientName: 'Alhaji Samuel Yusuf',
        startMinute: 970, // lateBy 35 -> missed
      }),
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
        caregiverId: 'cg-amina',
        caregiverName: 'Amina Bello',
        recipientName: 'Mrs. Funmilayo Adebayo',
        recipientAddress: null,
        latitude: null,
        longitude: null,
        createdAt: new Date('2026-07-24T16:35:00.000Z'),
        dispatchedAt: null,
      },
    ],
    caregiverLocations: [],
  };
}

function reads(snap: LiveSnapshot): LiveMonitoringReadModel {
  return { snapshot: () => Promise.resolve(snap) };
}

const NO_FILTERS = { branch: null, serviceType: null };

describe('GetLiveOverviewUseCase', () => {
  it('derives the six KPIs from the live snapshot', async () => {
    const result = await new GetLiveOverviewUseCase(reads(snapshot()), clock).execute(NO_FILTERS);
    expect(result.summary).toEqual({
      activeVisits: 2,
      caregiversCheckedIn: 2,
      checkInDue: 1,
      runningLate: 1,
      attentionRequired: 3,
      criticalAlerts: 1,
    });
  });

  it('builds the active visit summary, attention panel and activity feed', async () => {
    const result = await new GetLiveOverviewUseCase(reads(snapshot()), clock).execute(NO_FILTERS);

    const chioma = result.activeVisits.find((v) => v.visitId === 'v-chioma');
    expect(chioma?.service).toBe('Companionship');
    expect(chioma?.elapsedLabel).toBe('30m elapsed');

    expect(result.attentionRequired[0].kind).toBe('SOS');
    expect(result.attentionRequired[0].severity).toBe('CRITICAL');
    const kinds = result.attentionRequired.map((a) => a.kind);
    expect(kinds).toContain('MISSED_CHECK_IN');
    expect(kinds).toContain('VISIT_OVERDUE');

    const vitals = result.recentActivity.find((a) => a.type === 'VITALS');
    expect(vitals?.description).toContain('135/85');
  });
});

describe('Live Monitoring tabs', () => {
  it('filters active visits by service type', async () => {
    const result = await new ListActiveVisitsUseCase(reads(snapshot()), clock).execute({
      branch: null,
      serviceType: 'COMPANIONSHIP',
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    expect(result.rows[0].visitId).toBe('v-chioma');
  });

  it('lists the attention items', async () => {
    const result = await new ListAttentionUseCase(reads(snapshot()), clock).execute(NO_FILTERS);
    expect(result).toHaveLength(3);
  });
});
