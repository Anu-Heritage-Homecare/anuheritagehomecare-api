import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { OperationalTask } from '../../domain/operational-task.entity';
import { OperationalTaskRepository } from '../../domain/operational-task.repository';
import { TaskChildStore } from '../ports/task-child.store';
import { TaskDetailRead, TaskDetailReadModel } from '../ports/task-detail-read.port';
import { AddTaskCommentUseCase } from './add-task-comment.use-case';
import { DeleteTaskUseCase } from './delete-task.use-case';
import { GetTaskDetailUseCase } from './get-task-detail.use-case';
import { SetChecklistItemUseCase } from './set-checklist-item.use-case';

const NOW = new Date('2026-07-20T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function detail(over: Partial<TaskDetailRead>): TaskDetailRead {
  return {
    id: 't1',
    title: 'Complete morning medication chart',
    description: 'Verify medications',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    category: 'MEDICATION',
    assignedToAdminId: 'admin-1',
    assigneeName: 'Sarah Williams',
    assigneeLabel: null,
    createdByName: null,
    relatedCareRecipientId: 'r1',
    recipientName: 'Margaret Johnson',
    recurrenceLabel: 'Daily (weekdays)',
    estimatedMinutes: 20,
    dueAt: new Date('2026-07-20T10:00:00.000Z'),
    startedAt: new Date('2026-07-20T09:15:00.000Z'),
    assignedAt: new Date('2026-07-20T09:00:00.000Z'),
    createdAt: new Date('2026-07-18T07:00:00.000Z'),
    completedAt: null,
    checklist: [
      { id: 'c1', label: 'Verify list', done: true, completedAt: NOW },
      { id: 'c2', label: 'Confirm dosages', done: true, completedAt: NOW },
      { id: 'c3', label: 'Record times', done: true, completedAt: NOW },
      { id: 'c4', label: 'Document reactions', done: false, completedAt: null },
      { id: 'c5', label: 'Signature', done: false, completedAt: null },
    ],
    comments: [
      {
        id: 'm1',
        authorAdminId: 'admin-1',
        authorName: 'Sarah Williams',
        body: 'Started',
        createdAt: NOW,
      },
      { id: 'm2', authorAdminId: null, authorName: null, body: 'Auto note', createdAt: NOW },
    ],
    relatedVisit: {
      id: 'v1',
      sequence: 10,
      visitType: 'MORNING_CARE',
      scheduledDate: new Date('2026-07-20T00:00:00.000Z'),
      startMinute: 480,
      endMinute: 600,
      status: 'IN_PROGRESS',
      caregiverName: 'Sarah Williams',
      recipientName: 'Margaret Johnson',
      location: '142 Oak Lane, Apartment 3B',
    },
    relatedTasks: [
      {
        id: 't2',
        title: 'Evening medication chart',
        status: 'OPEN',
        dueAt: new Date('2026-07-20T18:00:00.000Z'),
      },
    ],
    ...over,
  };
}

function reads(d: TaskDetailRead | null): TaskDetailReadModel {
  return { load: () => Promise.resolve(d) };
}

describe('GetTaskDetailUseCase', () => {
  it('computes progress, derives the activity trail newest first and labels the screen', async () => {
    const result = await new GetTaskDetailUseCase(reads(detail({})), clock).execute('t1');

    expect(result.progress).toEqual({ completed: 3, total: 5, percent: 60 });
    expect(result.createdByLabel).toBe('System (Auto-generated)');
    expect(result.recurrenceLabel).toBe('Daily (weekdays)');
    expect(result.estimatedMinutes).toBe(20);
    expect(result.relatedVisit).toMatchObject({
      visitLabel: 'Morning Care Visit',
      dateLabel: 'July 20, 2026',
      timeRange: '8:00 AM - 10:00 AM',
      statusLabel: 'In Progress',
      location: '142 Oak Lane, Apartment 3B',
    });
    expect(result.comments.map((c) => c.authorName)).toEqual(['Sarah Williams', 'System']);
    // Newest first: started (9:15) > assigned (9:00) > created (7-18).
    expect(result.activity.map((a) => a.kind)).toEqual(['STARTED', 'ASSIGNED', 'CREATED']);
    expect(result.activity[1].label).toBe('Assigned to Sarah Williams');
    expect(result.relatedTasks[0].statusLabel).toBe('Pending');
  });

  it('throws when the task does not exist', async () => {
    await expect(
      new GetTaskDetailUseCase(reads(null), clock).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

function childStore(itemTaskId: string | null): TaskChildStore & {
  set: Array<{ itemId: string; done: boolean }>;
  comments: Array<{ taskId: string; body: string }>;
} {
  const set: Array<{ itemId: string; done: boolean }> = [];
  const comments: Array<{ taskId: string; body: string }> = [];
  return {
    set,
    comments,
    createChecklistItems: () => Promise.resolve(),
    findChecklistItemTaskId: () => Promise.resolve(itemTaskId),
    setChecklistItemDone: (itemId, done) => {
      set.push({ itemId, done });
      return Promise.resolve();
    },
    addComment: (taskId, _author, body) => {
      comments.push({ taskId, body });
      return Promise.resolve();
    },
  };
}

describe('SetChecklistItemUseCase', () => {
  it('ticks an item that belongs to the task', async () => {
    const store = childStore('t1');
    await new SetChecklistItemUseCase(store, clock).execute({
      taskId: 't1',
      itemId: 'c4',
      done: true,
    });
    expect(store.set).toEqual([{ itemId: 'c4', done: true }]);
  });

  it('rejects an item that does not belong to the task', async () => {
    const store = childStore('other-task');
    await expect(
      new SetChecklistItemUseCase(store, clock).execute({ taskId: 't1', itemId: 'c4', done: true }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

function taskRepo(exists: boolean): OperationalTaskRepository & { deleted: string[] } {
  const deleted: string[] = [];
  const task = OperationalTask.create({ id: 't1', title: 'x', now: NOW });
  return {
    deleted,
    save: () => Promise.resolve(),
    delete: (id) => {
      deleted.push(id);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(exists ? task : null),
    findByIds: () => Promise.resolve([]),
    list: () => Promise.resolve([]),
    countOpen: () => Promise.resolve(0),
  };
}

describe('AddTaskCommentUseCase', () => {
  it('adds a comment to an existing task', async () => {
    const store = childStore('t1');
    await new AddTaskCommentUseCase(taskRepo(true), store, clock).execute({
      taskId: 't1',
      authorAdminId: 'admin-1',
      body: 'Please reorder supplies',
    });
    expect(store.comments).toEqual([{ taskId: 't1', body: 'Please reorder supplies' }]);
  });

  it('throws when the task is missing', async () => {
    await expect(
      new AddTaskCommentUseCase(taskRepo(false), childStore('t1'), clock).execute({
        taskId: 't1',
        authorAdminId: 'admin-1',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('DeleteTaskUseCase', () => {
  it('deletes an existing task', async () => {
    const repo = taskRepo(true);
    await new DeleteTaskUseCase(repo).execute('t1');
    expect(repo.deleted).toEqual(['t1']);
  });

  it('throws when the task is missing', async () => {
    await expect(new DeleteTaskUseCase(taskRepo(false)).execute('t1')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
