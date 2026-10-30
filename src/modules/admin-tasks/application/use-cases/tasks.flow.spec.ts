import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { OperationalTask } from '../../domain/operational-task.entity';
import { OperationalTaskRepository } from '../../domain/operational-task.repository';
import { TaskStatus } from '../../domain/task-status.enum';
import { TaskChildStore } from '../ports/task-child.store';
import { CreateTaskUseCase } from './create-task.use-case';
import { ListTasksUseCase } from './list-tasks.use-case';
import { UpdateTaskStatusUseCase } from './update-task-status.use-case';

const NOW = new Date('2026-09-06T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `task-${n}`;
    },
  };
}

class InMemoryTaskRepository implements OperationalTaskRepository {
  public readonly store = new Map<string, OperationalTask>();

  save(task: OperationalTask): Promise<void> {
    this.store.set(task.id, task);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }

  findById(id: string): Promise<OperationalTask | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByIds(ids: string[]): Promise<OperationalTask[]> {
    return Promise.resolve(
      ids.map((id) => this.store.get(id)).filter((t): t is OperationalTask => t !== undefined),
    );
  }

  list(statusFilter: TaskStatus | null, limit: number): Promise<OperationalTask[]> {
    const all = [...this.store.values()].filter(
      (t) => statusFilter === null || t.status === statusFilter,
    );
    return Promise.resolve(all.slice(0, limit));
  }

  countOpen(): Promise<number> {
    return Promise.resolve([...this.store.values()].filter((t) => t.isOpen).length);
  }
}

const childStore: TaskChildStore = {
  createChecklistItems: () => Promise.resolve(),
  findChecklistItemTaskId: () => Promise.resolve(null),
  setChecklistItemDone: () => Promise.resolve(),
  addComment: () => Promise.resolve(),
};

describe('operational tasks', () => {
  it('creates a task that counts as open, then completes it', async () => {
    const repo = new InMemoryTaskRepository();
    const created = await new CreateTaskUseCase(repo, childStore, clock, sequentialIds()).execute({
      createdByAdminId: 'admin-1',
      title: 'Chase CPR renewal',
    });
    expect(created.status).toBe(TaskStatus.Open);
    expect(await repo.countOpen()).toBe(1);

    const done = await new UpdateTaskStatusUseCase(repo, clock).execute({
      taskId: created.id,
      transition: 'COMPLETE',
    });
    expect(done.status).toBe(TaskStatus.Done);
    expect(done.completedAt).not.toBeNull();
    expect(await repo.countOpen()).toBe(0);
  });

  it('filters the list by status', async () => {
    const repo = new InMemoryTaskRepository();
    const create = new CreateTaskUseCase(repo, childStore, clock, sequentialIds());
    const a = await create.execute({ createdByAdminId: 'admin-1', title: 'A' });
    await create.execute({ createdByAdminId: 'admin-1', title: 'B' });
    await new UpdateTaskStatusUseCase(repo, clock).execute({ taskId: a.id, transition: 'START' });

    const inProgress = await new ListTasksUseCase(repo).execute(TaskStatus.InProgress);
    expect(inProgress.map((t) => t.title)).toEqual(['A']);
  });

  it('rejects a transition on an unknown task', async () => {
    const repo = new InMemoryTaskRepository();
    await expect(
      new UpdateTaskStatusUseCase(repo, clock).execute({ taskId: 'nope', transition: 'START' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects starting a task that is not open', () => {
    const task = OperationalTask.create({ id: 't1', title: 'x', now: NOW });
    task.complete(NOW);
    expect(() => task.start(NOW)).toThrow(ValidationException);
  });
});
