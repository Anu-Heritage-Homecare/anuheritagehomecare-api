import { SetCareGoalsUseCase } from '@modules/care-recipients/application/use-cases/set-care-goals.use-case';
import { CareGoal } from '@modules/care-recipients/domain/care-goal.entity';
import { CareGoalStatus } from '@modules/care-recipients/domain/care-goal-status.enum';
import { CareGoalRepository } from '@modules/care-recipients/domain/care-goal.repository';
import { CareInstruction } from '@modules/care-recipients/domain/care-instruction.entity';
import {
  CareInstructionCategory,
  CareInstructionSeverity,
} from '@modules/care-recipients/domain/care-instruction.enums';
import { CareInstructionRepository } from '@modules/care-recipients/domain/care-instruction.repository';
import { CarePlanRevision } from '@modules/care-recipients/domain/care-plan-revision.entity';
import { CarePlanRevisionRepository } from '@modules/care-recipients/domain/care-plan-revision.repository';
import { CarePlanScheduleBlock } from '@modules/care-recipients/domain/care-plan-schedule-block.entity';
import { CarePlanScheduleRepository } from '@modules/care-recipients/domain/care-plan-schedule-block.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { SetCarePlanGoalsUseCase } from './set-care-plan-goals.use-case';
import { SetCarePlanInstructionsUseCase } from './set-care-plan-instructions.use-case';
import { SetCarePlanScheduleUseCase } from './set-care-plan-schedule.use-case';

const NOW = new Date('2026-07-20T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

class RevisionRepo implements CarePlanRevisionRepository {
  public readonly store: CarePlanRevision[] = [];
  add(revision: CarePlanRevision): Promise<void> {
    this.store.push(revision);
    return Promise.resolve();
  }
  listForRecipient(): Promise<CarePlanRevision[]> {
    return Promise.resolve([...this.store]);
  }
}

class GoalRepo implements CareGoalRepository {
  public goals: CareGoal[] = [];
  replaceForRecipient(_id: string, goals: CareGoal[]): Promise<void> {
    this.goals = goals;
    return Promise.resolve();
  }
  listForRecipient(): Promise<CareGoal[]> {
    return Promise.resolve(this.goals);
  }
}

class ScheduleRepo implements CarePlanScheduleRepository {
  public blocks: CarePlanScheduleBlock[] = [];
  replaceForRecipient(_id: string, blocks: CarePlanScheduleBlock[]): Promise<void> {
    this.blocks = blocks;
    return Promise.resolve();
  }
  listForRecipient(): Promise<CarePlanScheduleBlock[]> {
    return Promise.resolve(this.blocks);
  }
}

class InstructionRepo implements CareInstructionRepository {
  public items: CareInstruction[] = [];
  replaceForRecipient(_id: string, items: CareInstruction[]): Promise<void> {
    this.items = items;
    return Promise.resolve();
  }
  listForRecipient(): Promise<CareInstruction[]> {
    return Promise.resolve(this.items);
  }
}

describe('care plan admin writes', () => {
  it('replaces goals and records a revision attributed to the admin', async () => {
    const goalRepo = new GoalRepo();
    const revisions = new RevisionRepo();
    const useCase = new SetCarePlanGoalsUseCase(
      recipients(true),
      new SetCareGoalsUseCase(goalRepo, ids()),
      revisions,
      clock,
      ids(),
    );

    const result = await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      revisionNote: 'Added physical therapy goal',
      goals: [
        {
          label: 'Physical mobility maintenance',
          progressPercent: 60,
          status: CareGoalStatus.OnTrack,
        },
      ],
    });

    expect(result.goalCount).toBe(1);
    expect(goalRepo.goals[0].progressPercent).toBe(60);
    expect(revisions.store[0].description).toBe('Added physical therapy goal');
    expect(revisions.store[0].authorAdminId).toBe('admin-1');
  });

  it('replaces the schedule with a default revision note', async () => {
    const scheduleRepo = new ScheduleRepo();
    const revisions = new RevisionRepo();
    const useCase = new SetCarePlanScheduleUseCase(
      recipients(true),
      scheduleRepo,
      revisions,
      clock,
      ids(),
    );

    await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      blocks: [{ startMinute: 420, title: 'Wake-up', description: 'Morning hygiene' }],
    });

    expect(scheduleRepo.blocks[0].startMinute).toBe(420);
    expect(revisions.store[0].description).toBe('Daily care schedule updated');
  });

  it('replaces instructions and records a revision', async () => {
    const instructionRepo = new InstructionRepo();
    const revisions = new RevisionRepo();
    const useCase = new SetCarePlanInstructionsUseCase(
      recipients(true),
      instructionRepo,
      revisions,
      clock,
      ids(),
    );

    await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      instructions: [
        {
          category: CareInstructionCategory.Medical,
          text: 'Blood pressure check twice daily',
          severity: CareInstructionSeverity.Critical,
        },
      ],
    });

    expect(instructionRepo.items[0].text).toBe('Blood pressure check twice daily');
    expect(revisions.store).toHaveLength(1);
  });

  it('rejects editing the plan of an unknown recipient', async () => {
    const useCase = new SetCarePlanScheduleUseCase(
      recipients(false),
      new ScheduleRepo(),
      new RevisionRepo(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({ recipientId: 'nope', adminId: 'admin-1', blocks: [] }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
