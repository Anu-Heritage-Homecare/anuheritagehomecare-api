import { Clock } from '@shared/application/ports/clock.port';
import {
  DashboardRecipientView,
  DashboardUserView,
  DashboardVisitView,
  FamilyRecipientDirectory,
  FamilyUserDirectory,
  FamilyVisitDirectory,
} from '../ports/family-dashboard-directories.port';
import { GetFamilyDashboardUseCase } from './get-family-dashboard.use-case';

const FIXED_NOW = new Date('2026-08-24T12:00:00.000Z');
const clock: Clock = { now: () => FIXED_NOW };

function recipientDirectory(recipients: DashboardRecipientView[]): FamilyRecipientDirectory {
  return {
    listActiveForOwner: (ownerId) =>
      Promise.resolve(recipients.filter((recipient) => recipient.ownerId === ownerId)),
  };
}

function visitDirectory(visits: DashboardVisitView[]): FamilyVisitDirectory {
  return { listForRecipientsOnDay: () => Promise.resolve(visits) };
}

function userDirectory(users: DashboardUserView[]): FamilyUserDirectory {
  return {
    findByIds: () => Promise.resolve(new Map(users.map((user) => [user.id, user]))),
  };
}

const RECIPIENT: DashboardRecipientView = {
  id: 'r1',
  ownerId: 'owner-1',
  name: 'Mrs Moses Rose',
  gender: 'FEMALE',
  dateOfBirth: new Date('1943-06-01T00:00:00.000Z'),
  photoKey: null,
  medications: [{ id: 'm1', name: 'Metformin' }],
};

const VISIT: DashboardVisitView = {
  id: 'v1',
  careRecipientId: 'r1',
  caregiverId: 'cg1',
  status: 'IN_PROGRESS',
  startMinute: 9 * 60,
  endMinute: 19 * 60,
  clockInAt: new Date('2026-08-24T09:03:00.000Z'),
  clockOutAt: null,
  tasks: [
    { label: 'Medication', completed: true, completedAt: new Date('2026-08-24T09:10:00.000Z') },
    { label: 'Breakfast', completed: true, completedAt: new Date('2026-08-24T09:20:00.000Z') },
    { label: 'Vitals', completed: false, completedAt: null },
  ],
  medicationEvents: [
    {
      medicationId: 'm1',
      outcome: 'ADMINISTERED',
      recordedAt: new Date('2026-08-24T09:10:00.000Z'),
    },
  ],
  vitalsEvents: [{ hasBloodPressure: true, recordedAt: new Date('2026-08-24T09:50:00.000Z') }],
};

const USERS: DashboardUserView[] = [
  { id: 'owner-1', firstName: 'Sarah', lastName: 'Owner' },
  { id: 'cg1', firstName: 'Sarah Adams', lastName: 'John' },
];

describe('GetFamilyDashboardUseCase', () => {
  it('aggregates today care, progress, activity and caregiver for the owner', async () => {
    const useCase = new GetFamilyDashboardUseCase(
      recipientDirectory([RECIPIENT]),
      visitDirectory([VISIT]),
      userDirectory(USERS),
      clock,
    );

    const result = await useCase.execute({ ownerId: 'owner-1' });

    expect(result.greeting).toEqual({ ownerFirstName: 'Sarah', recipientName: 'Mrs Moses Rose' });

    const recipient = result.recipients[0];
    expect(recipient.age).toBe(83);
    expect(recipient.careState).toBe('RECEIVING_CARE');
    expect(recipient.todayVisit?.startedAt).toBe('2026-08-24T09:03:00.000Z');
    expect(recipient.todayVisit?.estimatedFinishMinute).toBe(19 * 60);
    expect(recipient.todayVisit?.progress).toEqual({ completed: 2, total: 3, percent: 67 });
    expect(recipient.todayVisit?.caregiver).toEqual({ id: 'cg1', name: 'Sarah Adams John' });
  });

  it('builds the recent updates feed newest first with friendly labels', async () => {
    const useCase = new GetFamilyDashboardUseCase(
      recipientDirectory([RECIPIENT]),
      visitDirectory([VISIT]),
      userDirectory(USERS),
      clock,
    );

    const { recentUpdates } = (await useCase.execute({ ownerId: 'owner-1' })).recipients[0];

    // Newest first: vitals at 09:50 leads.
    expect(recentUpdates[0]).toEqual({
      at: '2026-08-24T09:50:00.000Z',
      kind: 'VITALS',
      label: 'Blood pressure recorded',
    });
    const labels = recentUpdates.map((update) => update.label);
    expect(labels).toContain('Metformin given');
    expect(labels).toContain('Breakfast completed');
    expect(labels).toContain('Medication completed');
  });

  it('reports no visit today when the recipient has none', async () => {
    const useCase = new GetFamilyDashboardUseCase(
      recipientDirectory([RECIPIENT]),
      visitDirectory([]),
      userDirectory(USERS),
      clock,
    );

    const recipient = (await useCase.execute({ ownerId: 'owner-1' })).recipients[0];
    expect(recipient.careState).toBe('NO_VISIT_TODAY');
    expect(recipient.todayVisit).toBeNull();
    expect(recipient.recentUpdates).toEqual([]);
  });

  it('returns an empty dashboard for an owner with no active recipients', async () => {
    const useCase = new GetFamilyDashboardUseCase(
      recipientDirectory([]),
      visitDirectory([]),
      userDirectory(USERS),
      clock,
    );

    const result = await useCase.execute({ ownerId: 'owner-1' });
    expect(result.recipients).toEqual([]);
    expect(result.greeting.recipientName).toBeNull();
  });

  it('prefers an in progress visit over a scheduled one for the same recipient', async () => {
    const scheduled: DashboardVisitView = {
      ...VISIT,
      id: 'v2',
      status: 'SCHEDULED',
      startMinute: 8 * 60,
      clockInAt: null,
    };
    const useCase = new GetFamilyDashboardUseCase(
      recipientDirectory([RECIPIENT]),
      visitDirectory([scheduled, VISIT]),
      userDirectory(USERS),
      clock,
    );

    const recipient = (await useCase.execute({ ownerId: 'owner-1' })).recipients[0];
    expect(recipient.todayVisit?.id).toBe('v1');
    expect(recipient.careState).toBe('RECEIVING_CARE');
  });
});
