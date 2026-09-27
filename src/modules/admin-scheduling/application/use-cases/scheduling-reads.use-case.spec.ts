import { Clock } from '@shared/application/ports/clock.port';
import {
  SchedulingDayView,
  SchedulingReadModel,
  SchedulingVisitRow,
} from '../ports/scheduling-read.port';
import { GetSchedulingConsoleUseCase } from './get-scheduling-console.use-case';
import {
  GetSchedulingConflictsUseCase,
  ListUnassignedVisitsUseCase,
} from './scheduling-tabs.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function row(over: Partial<SchedulingVisitRow> & { id: string }): SchedulingVisitRow {
  return {
    scheduledDate: new Date(Date.UTC(2026, 6, 24)),
    startMinute: 480,
    endMinute: 540,
    visitType: 'MORNING_CARE',
    priority: 'NORMAL',
    status: 'SCHEDULED',
    caregiverId: null,
    recipientName: 'Recipient',
    caregiverName: null,
    ...over,
  };
}

function dayView(): SchedulingDayView {
  return {
    activeCaregivers: 10,
    visits: [
      row({
        id: 'v1',
        startMinute: 420,
        endMinute: 480,
        status: 'COMPLETED',
        caregiverId: 'A',
        caregiverName: 'John Adams',
        priority: 'CRITICAL',
        recipientName: 'William Taylor',
      }),
      row({
        id: 'v2',
        startMinute: 480,
        endMinute: 540,
        status: 'COMPLETED',
        caregiverId: 'B',
        caregiverName: 'Sarah Williams',
      }),
      row({
        id: 'v3',
        startMinute: 570,
        endMinute: 630,
        status: 'IN_PROGRESS',
        caregiverId: 'C',
        caregiverName: 'Maria Garcia',
        visitType: 'PHYSICAL_THERAPY',
      }),
      row({
        id: 'v4',
        startMinute: 600,
        endMinute: 660,
        status: 'IN_PROGRESS',
        caregiverId: 'C',
        caregiverName: 'Maria Garcia',
        visitType: 'WOUND_CARE',
      }),
      row({
        id: 'v5',
        startMinute: 660,
        endMinute: 720,
        status: 'SCHEDULED',
        caregiverId: null,
        recipientName: 'James Wilson',
        priority: 'URGENT',
      }),
      row({
        id: 'v6',
        startMinute: 840,
        endMinute: 900,
        status: 'SCHEDULED',
        caregiverId: 'A',
        caregiverName: 'John Adams',
      }),
      row({
        id: 'v7',
        startMinute: 900,
        endMinute: 960,
        status: 'SCHEDULED',
        caregiverId: null,
        recipientName: 'Eleanor Davis',
      }),
    ],
  };
}

function reads(view: SchedulingDayView): SchedulingReadModel {
  return {
    day: () => Promise.resolve(view),
    range: () => Promise.resolve(view.visits),
  };
}

describe('GetSchedulingConsoleUseCase', () => {
  it('derives the six KPIs, tab counts and the paginated table', async () => {
    const result = await new GetSchedulingConsoleUseCase(reads(dayView()), clock).execute({
      date: null,
      status: null,
      priority: null,
      search: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.summary).toEqual({
      todaysVisits: 7,
      upcomingVisits: 3,
      availableCaregivers: 9,
      unassignedVisits: 2,
      scheduleConflicts: 1,
      completedVisits: 2,
    });
    expect(result.tabCounts).toEqual({ unassigned: 2, conflicts: 1 });
    expect(result.visits.total).toBe(7);

    const first = result.visits.rows[0];
    expect(first.recipientName).toBe('William Taylor');
    expect(first.status).toBe('Completed');
    expect(first.priority).toBe('Critical');
    expect(first.service).toBe('Morning Care');

    const unassigned = result.visits.rows.find((r) => r.id === 'v5');
    expect(unassigned?.status).toBe('Unassigned');
    expect(unassigned?.assignable).toBe(true);
    expect(result.visits.rows.find((r) => r.id === 'v6')?.status).toBe('Upcoming');
  });

  it('filters the table by status and priority', async () => {
    const base = {
      date: null,
      priority: null,
      search: null,
      page: 1,
      pageSize: 10,
    };
    const completed = await new GetSchedulingConsoleUseCase(reads(dayView()), clock).execute({
      ...base,
      status: 'COMPLETED',
      priority: null,
    });
    expect(completed.visits.total).toBe(2);

    const critical = await new GetSchedulingConsoleUseCase(reads(dayView()), clock).execute({
      ...base,
      status: null,
      priority: 'CRITICAL',
    });
    expect(critical.visits.total).toBe(1);
  });
});

describe('scheduling tabs', () => {
  it('lists the day unassigned visits', async () => {
    const result = await new ListUnassignedVisitsUseCase(reads(dayView()), clock).execute({
      date: null,
      page: 1,
      pageSize: 10,
    });
    expect(result.total).toBe(2);
    expect(result.rows.every((r) => r.assignable)).toBe(true);
  });

  it('detects the caregiver double booking', async () => {
    const result = await new GetSchedulingConflictsUseCase(reads(dayView()), clock).execute({
      date: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].caregiverName).toBe('Maria Garcia');
    expect(result[0].first.id).toBe('v3');
    expect(result[0].second.id).toBe('v4');
  });
});
