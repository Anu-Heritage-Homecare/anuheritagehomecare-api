import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareGoal } from '../../domain/care-goal.entity';
import { CareGoalStatus } from '../../domain/care-goal-status.enum';
import { CareGoalRepository } from '../../domain/care-goal.repository';
import { SetCareGoalsUseCase } from './set-care-goals.use-case';

class InMemoryCareGoalRepository implements CareGoalRepository {
  public byRecipient = new Map<string, CareGoal[]>();

  replaceForRecipient(careRecipientId: string, goals: CareGoal[]): Promise<void> {
    this.byRecipient.set(careRecipientId, goals);
    return Promise.resolve();
  }

  listForRecipient(careRecipientId: string): Promise<CareGoal[]> {
    return Promise.resolve(this.byRecipient.get(careRecipientId) ?? []);
  }
}

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `goal-${(n += 1)}` };
}

describe('SetCareGoalsUseCase', () => {
  it('replaces the recipient goals in order, positioned', async () => {
    const repo = new InMemoryCareGoalRepository();
    const useCase = new SetCareGoalsUseCase(repo, ids());

    const result = await useCase.execute({
      careRecipientId: 'r1',
      goals: [
        { label: 'Maintain independence', progressPercent: 100, status: CareGoalStatus.Achieved },
        { label: 'Fall prevention', progressPercent: 60, status: CareGoalStatus.OnTrack },
      ],
    });

    expect(result).toEqual([
      {
        label: 'Maintain independence',
        progressPercent: 100,
        status: CareGoalStatus.Achieved,
        achieved: true,
      },
      {
        label: 'Fall prevention',
        progressPercent: 60,
        status: CareGoalStatus.OnTrack,
        achieved: false,
      },
    ]);
    const stored = repo.byRecipient.get('r1') ?? [];
    expect(stored.map((goal) => goal.position)).toEqual([0, 1]);
    expect(stored[0].id).toBe('goal-1');
  });

  it('rejects a blank goal label', async () => {
    const useCase = new SetCareGoalsUseCase(new InMemoryCareGoalRepository(), ids());

    await expect(
      useCase.execute({
        careRecipientId: 'r1',
        goals: [{ label: '   ', progressPercent: 0, status: CareGoalStatus.OnTrack }],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
