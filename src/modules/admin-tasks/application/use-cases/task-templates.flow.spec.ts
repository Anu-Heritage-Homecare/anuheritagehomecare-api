import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { TaskCategory } from '../../domain/task-category.enum';
import { TaskTemplate } from '../../domain/task-template.entity';
import { TaskTemplateRepository } from '../../domain/task-template.repository';
import { TaskChildStore } from '../ports/task-child.store';
import { GetTaskTemplatesScreenUseCase } from './get-task-templates-screen.use-case';
import {
  DuplicateTaskTemplateUseCase,
  InstantiateTaskTemplateUseCase,
  SetTaskTemplateActiveUseCase,
  UpdateTaskTemplateUseCase,
} from './task-templates.use-case';
import { OperationalTaskRepository } from '../../domain/operational-task.repository';

const NOW = new Date('2026-10-30T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function template(over: {
  id: string;
  name?: string;
  category?: TaskCategory;
  checklistItems?: string[];
  active?: boolean;
}): TaskTemplate {
  const t = TaskTemplate.create({
    id: over.id,
    name: over.name ?? `Template ${over.id}`,
    title: 'Do the thing',
    category: over.category ?? TaskCategory.Other,
    checklistItems: over.checklistItems ?? ['a', 'b'],
    scheduleLabel: 'Daily, 7:00 AM - 8:00 AM',
    estimatedMinutes: 45,
    defaultAssigneeLabel: 'All Caregivers',
    now: NOW,
  });
  if (over.active === false) {
    t.setActive(false, NOW);
  }
  return t;
}

function templateRepo(
  seed: TaskTemplate[],
): TaskTemplateRepository & { store: Map<string, TaskTemplate> } {
  const store = new Map(seed.map((t) => [t.id, t]));
  return {
    store,
    save: (t) => {
      store.set(t.id, t);
      return Promise.resolve();
    },
    findById: (id) => Promise.resolve(store.get(id) ?? null),
    list: () => Promise.resolve([...store.values()]),
    delete: (id) => {
      store.delete(id);
      return Promise.resolve();
    },
  };
}

describe('GetTaskTemplatesScreenUseCase', () => {
  it('counts active templates and distinct operations, and shows active templates by default', async () => {
    const repo = templateRepo([
      template({ id: '1', category: TaskCategory.Medication }),
      template({ id: '2', category: TaskCategory.Documentation }),
      template({ id: '3', category: TaskCategory.Medication, active: false }),
    ]);
    const result = await new GetTaskTemplatesScreenUseCase(repo).execute();

    expect(result.kpis.activeTemplates).toBe(2);
    expect(result.kpis.operations).toBe(2); // Medication + Documentation among active
    expect(result.kpis.tasksGeneratedThisWeek).toBeNull();
    expect(result.kpis.avgCompletionRatePercent).toBeNull();
    // Inactive template '3' is hidden by default.
    expect(result.templates.map((t) => t.id).sort()).toEqual(['1', '2']);
    expect(result.templates[0]).toMatchObject({
      itemCount: 2,
      estimatedMinutes: 45,
      scheduleLabel: 'Daily, 7:00 AM - 8:00 AM',
      assigneeLabel: 'All Caregivers',
      tasksGenerated: null,
      completionRatePercent: null,
    });
  });

  it('filters by category and by inactive status', async () => {
    const repo = templateRepo([
      template({ id: '1', category: TaskCategory.Medication }),
      template({ id: '2', category: TaskCategory.Documentation }),
      template({ id: '3', category: TaskCategory.Medication, active: false }),
    ]);
    const byCategory = await new GetTaskTemplatesScreenUseCase(repo).execute({
      category: 'MEDICATION',
    });
    expect(byCategory.templates.map((t) => t.id)).toEqual(['1']);

    const inactive = await new GetTaskTemplatesScreenUseCase(repo).execute({ status: 'INACTIVE' });
    expect(inactive.templates.map((t) => t.id)).toEqual(['3']);
  });
});

describe('UpdateTaskTemplateUseCase', () => {
  it('edits fields', async () => {
    const repo = templateRepo([template({ id: '1' })]);
    const result = await new UpdateTaskTemplateUseCase(repo, clock).execute({
      templateId: '1',
      name: 'Renamed',
      estimatedMinutes: 30,
    });
    expect(result.name).toBe('Renamed');
    expect(result.estimatedMinutes).toBe(30);
  });

  it('throws when missing', async () => {
    await expect(
      new UpdateTaskTemplateUseCase(templateRepo([]), clock).execute({ templateId: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('DuplicateTaskTemplateUseCase', () => {
  it('creates an active copy named "<name> (Copy)"', async () => {
    const repo = templateRepo([template({ id: '1', name: 'Morning Care Routine' })]);
    const ids: IdGenerator = { generate: () => 'copy-1' };
    const result = await new DuplicateTaskTemplateUseCase(repo, ids, clock).execute('1', 'admin-1');
    expect(result.id).toBe('copy-1');
    expect(result.name).toBe('Morning Care Routine (Copy)');
    expect(result.active).toBe(true);
    expect(result.checklistItems).toEqual(['a', 'b']);
  });
});

describe('SetTaskTemplateActiveUseCase', () => {
  it('deactivates a template', async () => {
    const repo = templateRepo([template({ id: '1' })]);
    const result = await new SetTaskTemplateActiveUseCase(repo, clock).execute('1', false);
    expect(result.active).toBe(false);
  });
});

describe('InstantiateTaskTemplateUseCase checklist', () => {
  it('creates the task checklist from the template defaults', async () => {
    const repo = templateRepo([template({ id: '1', checklistItems: ['verify', 'record'] })]);
    const tasks: OperationalTaskRepository = {
      save: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
      findByIds: () => Promise.resolve([]),
      list: () => Promise.resolve([]),
      countOpen: () => Promise.resolve(0),
    };
    const created: Array<{ taskId: string; labels: string[] }> = [];
    const childStore: TaskChildStore = {
      createChecklistItems: (taskId, labels) => {
        created.push({ taskId, labels });
        return Promise.resolve();
      },
      findChecklistItemTaskId: () => Promise.resolve(null),
      setChecklistItemDone: () => Promise.resolve(),
      addComment: () => Promise.resolve(),
    };
    const ids: IdGenerator = { generate: () => 'task-1' };
    await new InstantiateTaskTemplateUseCase(repo, tasks, childStore, ids, clock).execute({
      templateId: '1',
      createdByAdminId: 'admin-1',
    });
    expect(created).toEqual([{ taskId: 'task-1', labels: ['verify', 'record'] }]);
  });
});
