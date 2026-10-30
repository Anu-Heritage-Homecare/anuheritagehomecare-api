import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { OperationalTask } from '../../domain/operational-task.entity';
import { OperationalTaskRepository } from '../../domain/operational-task.repository';
import { TaskTemplate } from '../../domain/task-template.entity';
import { TaskTemplateRepository } from '../../domain/task-template.repository';
import { TaskChildStore } from '../ports/task-child.store';
import {
  TaskListRow,
  TasksKpiCounts,
  TasksReadModel,
  TasksTabCounts,
} from '../ports/tasks-read.port';
import { BulkAssignTasksUseCase, BulkCompleteTasksUseCase } from './bulk-tasks.use-case';
import { GetTasksScreenUseCase } from './get-tasks-screen.use-case';
import { InstantiateTaskTemplateUseCase } from './task-templates.use-case';

const NOW = new Date('2026-10-27T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'task-new' };

const noopChildStore: TaskChildStore = {
  createChecklistItems: () => Promise.resolve(),
  findChecklistItemTaskId: () => Promise.resolve(null),
  setChecklistItemDone: () => Promise.resolve(),
  addComment: () => Promise.resolve(),
};

function row(over: Partial<TaskListRow>): TaskListRow {
  return {
    id: 't1',
    title: 'Complete morning medication',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    category: 'MEDICATION',
    assignedToAdminId: 'admin-1',
    assigneeLabel: null,
    assigneeName: 'Sarah Williams',
    relatedCareRecipientId: 'r1',
    recipientName: 'Margaret Johnson',
    relatedVisitId: 'v1',
    visitSequence: 10,
    visitType: 'MORNING_CARE',
    dueAt: new Date('2026-10-27T10:00:00.000Z'),
    completedAt: null,
    ...over,
  };
}

const kpiCounts: TasksKpiCounts = {
  openTasks: 47,
  completedToday: 23,
  overdue: 8,
  highPriority: 12,
  dueToday: 19,
  totalTasks: 100,
  completedTotal: 84,
};

const tabCounts: TasksTabCounts = { all: 47, today: 19, overdue: 8, completed: 30 };

function reads(rows: TaskListRow[], total: number): TasksReadModel {
  return {
    listTasks: () => Promise.resolve({ rows, total }),
    kpis: () => Promise.resolve(kpiCounts),
    tabCounts: () => Promise.resolve(tabCounts),
  };
}

describe('GetTasksScreenUseCase', () => {
  it('maps KPIs (with completion rate), tab counts and enriched rows', async () => {
    const result = await new GetTasksScreenUseCase(
      reads([row({}), row({ id: 't2', dueAt: new Date('2026-10-25T09:00:00.000Z') })], 2),
      clock,
    ).execute({ page: 1, pageSize: 10 });

    expect(result.kpis).toMatchObject({
      openTasks: 47,
      completedToday: 23,
      overdue: 8,
      highPriority: 12,
      dueToday: 19,
      completionRatePercent: 84, // 84 / 100
    });
    expect(result.tabCounts).toEqual(tabCounts);
    expect(result.rows[0]).toMatchObject({
      title: 'Complete morning medication',
      relatedVisitLabel: 'Morning Care Visit',
      assignee: 'Sarah Williams',
      recipientName: 'Margaret Johnson',
      priorityLabel: 'High',
      statusLabel: 'In Progress',
      categoryLabel: 'Medication',
      dueDateLabel: 'Today, 10:00 AM',
    });
    // The second row is due before today and not done → Overdue badge.
    expect(result.rows[1].statusLabel).toBe('Overdue');
  });
});

function taskRepo(
  seed: OperationalTask[],
): OperationalTaskRepository & { saved: OperationalTask[] } {
  const store = new Map(seed.map((t) => [t.id, t]));
  const saved: OperationalTask[] = [];
  return {
    saved,
    save: (t) => {
      saved.push(t);
      return Promise.resolve();
    },
    delete: (id) => {
      store.delete(id);
      return Promise.resolve();
    },
    findById: (id) => Promise.resolve(store.get(id) ?? null),
    findByIds: (reqIds) =>
      Promise.resolve(
        reqIds.map((id) => store.get(id)).filter((t): t is OperationalTask => t !== undefined),
      ),
    list: () => Promise.resolve([...store.values()]),
    countOpen: () => Promise.resolve(0),
  };
}

function task(id: string): OperationalTask {
  return OperationalTask.create({ id, title: `Task ${id}`, now: NOW });
}

describe('bulk task operations', () => {
  it('bulk assigns tasks to a team label', async () => {
    const repo = taskRepo([task('a'), task('b')]);
    const result = await new BulkAssignTasksUseCase(repo, clock).execute({
      taskIds: ['a', 'b'],
      assigneeLabel: 'HR Team',
    });
    expect(result.updated).toBe(2);
    expect(repo.saved.every((t) => t.assigneeLabel === 'HR Team')).toBe(true);
  });

  it('bulk completes only not-done tasks', async () => {
    const done = task('c');
    done.complete(NOW);
    const repo = taskRepo([task('a'), done]);
    const result = await new BulkCompleteTasksUseCase(repo, clock).execute({ taskIds: ['a', 'c'] });
    expect(result.completed).toBe(1);
  });
});

describe('InstantiateTaskTemplateUseCase', () => {
  it('creates a task pre-filled from a template', async () => {
    const template = TaskTemplate.create({
      id: 'tmpl-1',
      name: 'Weekly report',
      title: 'Submit weekly visit report',
      defaultAssigneeLabel: 'Admin',
      now: NOW,
    });
    const templates: TaskTemplateRepository = {
      save: () => Promise.resolve(),
      findById: () => Promise.resolve(template),
      list: () => Promise.resolve([template]),
      delete: () => Promise.resolve(),
    };
    const repo = taskRepo([]);
    const result = await new InstantiateTaskTemplateUseCase(
      templates,
      repo,
      noopChildStore,
      ids,
      clock,
    ).execute({
      templateId: 'tmpl-1',
      createdByAdminId: 'admin-1',
    });
    expect(result.title).toBe('Submit weekly visit report');
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].assigneeLabel).toBe('Admin');
  });

  it('throws when the template does not exist', async () => {
    const templates: TaskTemplateRepository = {
      save: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
      list: () => Promise.resolve([]),
      delete: () => Promise.resolve(),
    };
    await expect(
      new InstantiateTaskTemplateUseCase(
        templates,
        taskRepo([]),
        noopChildStore,
        ids,
        clock,
      ).execute({
        templateId: 'missing',
        createdByAdminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
