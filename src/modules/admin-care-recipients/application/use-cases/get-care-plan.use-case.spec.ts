import { AdminUser } from '@modules/admin-identity/domain/admin-user.entity';
import { AdminUserRepository } from '@modules/admin-identity/domain/admin-user.repository';
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
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { GetCarePlanUseCase } from './get-care-plan.use-case';

const NOW = new Date('2026-07-20T00:00:00.000Z');
const R = 'r1';

const recipients: CareRecipientRepository = {
  save: () => Promise.resolve(),
  findById: (id: string) => Promise.resolve(id === R ? ({ id } as unknown as CareRecipient) : null),
  findByIds: () => Promise.resolve([]),
  listByOwner: () => Promise.resolve([]),
};

const goalsRepo: CareGoalRepository = {
  replaceForRecipient: () => Promise.resolve(),
  listForRecipient: () =>
    Promise.resolve([
      CareGoal.create({
        id: 'g1',
        careRecipientId: R,
        label: 'Medication adherence above 95%',
        progressPercent: 92,
        status: CareGoalStatus.NeedsAttention,
        position: 0,
      }),
    ]),
};

const scheduleRepo: CarePlanScheduleRepository = {
  replaceForRecipient: () => Promise.resolve(),
  listForRecipient: () =>
    Promise.resolve([
      CarePlanScheduleBlock.create({
        id: 's1',
        careRecipientId: R,
        startMinute: 420,
        title: 'Wake-up & Morning Hygiene',
        description: 'Assist with bathing, grooming, dressing',
        position: 0,
      }),
    ]),
};

const instructionsRepo: CareInstructionRepository = {
  replaceForRecipient: () => Promise.resolve(),
  listForRecipient: () =>
    Promise.resolve([
      CareInstruction.create({
        id: 'i1',
        careRecipientId: R,
        category: CareInstructionCategory.Medical,
        text: 'Blood pressure check twice daily',
        severity: CareInstructionSeverity.Critical,
        position: 0,
      }),
      CareInstruction.create({
        id: 'i2',
        careRecipientId: R,
        category: CareInstructionCategory.Behavioral,
        text: 'Responds well to music therapy',
        severity: CareInstructionSeverity.Normal,
        position: 1,
      }),
    ]),
};

const revisionsRepo: CarePlanRevisionRepository = {
  add: () => Promise.resolve(),
  listForRecipient: () =>
    Promise.resolve([
      CarePlanRevision.record({
        id: 'rev1',
        careRecipientId: R,
        description: 'Evening medication schedule adjusted',
        authorAdminId: 'admin-1',
        now: NOW,
      }),
    ]),
};

const admins: AdminUserRepository = {
  save: () => Promise.resolve(),
  findById: (id: string) =>
    Promise.resolve(
      id === 'admin-1' ? ({ id, name: { fullName: 'Mike Chen' } } as unknown as AdminUser) : null,
    ),
  findByEmail: () => Promise.resolve(null),
};

describe('GetCarePlanUseCase', () => {
  const useCase = new GetCarePlanUseCase(
    recipients,
    goalsRepo,
    scheduleRepo,
    instructionsRepo,
    revisionsRepo,
    admins,
  );

  it('assembles the care plan and splits instructions and resolves revision authors', async () => {
    const result = await useCase.execute(R);

    expect(result.goals).toEqual([
      { label: 'Medication adherence above 95%', progressPercent: 92, status: 'NEEDS_ATTENTION' },
    ]);
    expect(result.schedule[0].title).toBe('Wake-up & Morning Hygiene');
    expect(result.instructions.medical.map((i) => i.text)).toEqual([
      'Blood pressure check twice daily',
    ]);
    expect(result.instructions.behavioral.map((i) => i.text)).toEqual([
      'Responds well to music therapy',
    ]);
    expect(result.revisions[0]).toEqual({
      at: NOW,
      description: 'Evening medication schedule adjusted',
      authorName: 'Mike Chen',
    });
  });

  it('raises not found for an unknown recipient', async () => {
    await expect(useCase.execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
