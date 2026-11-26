import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareGoal } from '@modules/care-recipients/domain/care-goal.entity';
import { CareGoalStatus } from '@modules/care-recipients/domain/care-goal-status.enum';
import { CareGoalRepository } from '@modules/care-recipients/domain/care-goal.repository';
import { CareInstruction } from '@modules/care-recipients/domain/care-instruction.entity';
import { CareInstructionRepository } from '@modules/care-recipients/domain/care-instruction.repository';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import { CareTeamAssignmentRepository } from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VitalsReading } from '@modules/visits/domain/value-objects/vitals-reading.vo';
import { buildVisit } from '@modules/visits/test-support/doubles';
import { fakeCareAccess } from '../../test-support/fake-care-access';
import { FamilyPlanDirectory } from '../ports/family-plan-directory.port';
import { GetCareOverviewUseCase } from './get-care-overview.use-case';
import { GetCarePlanUseCase } from './get-care-plan.use-case';
import { GetRecipientHealthUseCase } from './get-recipient-health.use-case';

const NOW = new Date('2026-11-12T13:00:00.000Z');
const clock: Clock = { now: () => NOW };

function recipientStub(overrides: Record<string, unknown> = {}): CareRecipient {
  return {
    id: 'r1',
    ownerId: 'owner-1',
    careNeeds: ['MEAL_PREPARATION', 'BATHING', 'LAUNDRY'],
    medications: [
      { id: 'm1', name: 'Metformin' },
      { id: 'm2', name: 'Amlodipine' },
    ],
    primaryCaregiverId: null,
    schedule: {
      frequency: 'WEEKLY',
      estimatedStartDate: new Date('2026-11-01T00:00:00.000Z'),
      expectedDuration: '3 months',
      days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
      startMinute: 540,
      visitDurationMinutes: 180,
    },
    profile: {
      name: 'Mrs Moses Rose',
      gender: 'FEMALE',
      dateOfBirth: new Date('1944-01-01T00:00:00.000Z'),
      photoKey: null,
    },
    ...overrides,
  } as unknown as CareRecipient;
}

function recipients(recipient: CareRecipient): CareRecipientRepository {
  return {
    findById: (id: string) => Promise.resolve(id === 'r1' ? recipient : null),
  } as unknown as CareRecipientRepository;
}

const plans: FamilyPlanDirectory = {
  planNameForRecipient: () => Promise.resolve('Standard Care'),
};

function goalsRepo(goals: CareGoal[]): CareGoalRepository {
  return {
    listForRecipient: () => Promise.resolve(goals),
    replaceForRecipient: () => Promise.resolve(),
  };
}

function instructionsRepo(texts: string[]): CareInstructionRepository {
  return {
    listForRecipient: () =>
      Promise.resolve(texts.map((text) => ({ text }) as unknown as CareInstruction)),
    replaceForRecipient: () => Promise.resolve(),
  };
}

const sampleGoals = [
  CareGoal.create({
    id: 'g1',
    careRecipientId: 'r1',
    label: 'Maintain independence',
    progressPercent: 100,
    status: CareGoalStatus.Achieved,
    position: 0,
  }),
  CareGoal.create({
    id: 'g2',
    careRecipientId: 'r1',
    label: 'Fall prevention',
    progressPercent: 60,
    status: CareGoalStatus.OnTrack,
    position: 1,
  }),
];

const USER_DIR: Record<string, { id: string; name: { firstName: string; lastName: string } }> = {
  cg1: { id: 'cg1', name: { firstName: 'Sarah', lastName: 'Adams' } },
  cg2: { id: 'cg2', name: { firstName: 'John', lastName: 'Doe' } },
};

const users = {
  findById: (id: string) => Promise.resolve(USER_DIR[id] ?? null),
  findByIds: (ids: string[]) => Promise.resolve(ids.map((id) => USER_DIR[id]).filter(Boolean)),
} as unknown as UserRepository;

function careTeamRepo(
  assignments: { role: CareTeamRole; caregiverId: string }[],
): CareTeamAssignmentRepository {
  return {
    add: () => Promise.resolve(),
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listActiveForRecipient: () => Promise.resolve(assignments as unknown as CareTeamAssignment[]),
    listActiveForRecipients: () => Promise.resolve(assignments as unknown as CareTeamAssignment[]),
  };
}

const todaysVisit = buildVisit({
  id: 'v1',
  careRecipientId: 'r1',
  caregiverId: 'cg1',
  status: VisitStatus.InProgress,
  date: '2026-11-12',
  tasks: [
    { label: 'Medication', completed: true },
    { label: 'Breakfast', completed: true },
    { label: 'Walk', completed: false },
  ],
  vitals: [
    VitalsReading.create({
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      oxygenSaturation: 98,
      temperatureCelsius: 36.8,
      recordedAt: new Date('2026-11-12T09:50:00.000Z'),
    }),
  ],
});

function visitsRepo(list: unknown[]): VisitRepository {
  return {
    listForCareRecipientsInRange: () => Promise.resolve(list),
  } as unknown as VisitRepository;
}

describe('Care section reads', () => {
  it('overview aggregates plan, caregiver and summary counts', async () => {
    const useCase = new GetCareOverviewUseCase(
      recipients(recipientStub()),
      visitsRepo([todaysVisit]),
      users,
      plans,
      clock,
      fakeCareAccess(),
    );

    const result = await useCase.execute({ callerUserId: 'owner-1', careRecipientId: 'r1' });

    expect(result.carePlanName).toBe('Standard Care');
    expect(result.caregiver).toEqual({ id: 'cg1', name: 'Sarah Adams' });
    expect(result.summary.tasks).toEqual({ completed: 2, total: 3 });
    expect(result.summary.medications.total).toBe(2);
    expect(result.summary.hasVitals).toBe(true);
  });

  it('health classifies the latest vitals as normal', async () => {
    const useCase = new GetRecipientHealthUseCase(
      recipients(recipientStub()),
      visitsRepo([todaysVisit]),
      clock,
      fakeCareAccess(),
    );

    const result = await useCase.execute({ callerUserId: 'owner-1', careRecipientId: 'r1' });

    expect(result.vitals.bloodPressure).toEqual({
      value: { systolic: 120, diastolic: 80 },
      status: 'NORMAL',
    });
    expect(result.vitals.temperatureCelsius?.status).toBe('NORMAL');
    expect(result.vitals.oxygenSaturation?.status).toBe('NORMAL');
  });

  it('care plan derives services from care needs and schedule from the care schedule', async () => {
    const useCase = new GetCarePlanUseCase(
      recipients(recipientStub()),
      plans,
      goalsRepo(sampleGoals),
      instructionsRepo([]),
      careTeamRepo([]),
      users,
      fakeCareAccess(),
    );

    const result = await useCase.execute({ callerUserId: 'owner-1', careRecipientId: 'r1' });

    expect(result.planName).toBe('Standard Care');
    expect(result.services).toEqual(['Meal Prep', 'Bathing', 'Laundry']);
    expect(result.schedule?.expectedDuration).toBe('3 months');
    // The recurring pattern is formatted for the Visit Schedule widget.
    expect(result.schedule?.days).toEqual(['Mon', 'Wed', 'Fri']);
    expect(result.schedule?.startTime).toBe('9:00 AM');
    expect(result.schedule?.visitDurationHours).toBe(3);
    // Care goals come from the office set goal list.
    expect(result.goals).toEqual([
      { label: 'Maintain independence', achieved: true },
      { label: 'Fall prevention', achieved: false },
    ]);
    // No primary caregiver assigned and no instructions set.
    expect(result.caregivers.primary).toBeNull();
    expect(result.careInstructions).toBeNull();
  });

  it('care plan surfaces the office assigned care team and instructions', async () => {
    const useCase = new GetCarePlanUseCase(
      recipients(recipientStub({ primaryCaregiverId: 'cg1' })),
      plans,
      goalsRepo(sampleGoals),
      instructionsRepo(['Keep hydrated', 'No dairy']),
      careTeamRepo([{ role: CareTeamRole.Coordinator, caregiverId: 'cg2' }]),
      users,
      fakeCareAccess(),
    );

    const result = await useCase.execute({ callerUserId: 'owner-1', careRecipientId: 'r1' });

    // Primary from the synced pointer, coordinator from the active assignment.
    expect(result.caregivers.primary).toEqual({ id: 'cg1', name: 'Sarah Adams' });
    expect(result.caregivers.coordinator).toEqual({ id: 'cg2', name: 'John Doe' });
    expect(result.caregivers.backup).toBeNull();
    expect(result.careInstructions).toBe('Keep hydrated\nNo dairy');
  });
});
