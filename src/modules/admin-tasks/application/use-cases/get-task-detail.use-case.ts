import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  TaskActivityEntryResult,
  TaskDetailResult,
  TaskRelatedVisitResult,
} from '../dto/task-detail.result';
import {
  TASK_DETAIL_READ_MODEL,
  TaskDetailRead,
  TaskDetailReadModel,
} from '../ports/task-detail-read.port';
import {
  categoryLabel,
  dueDateLabel,
  longDateLabel,
  minuteLabel,
  priorityLabel,
  relatedVisitLabel,
  statusLabel,
} from '../tasks.presenter';

/** Use case: load the full task detail screen. */
@Injectable()
export class GetTaskDetailUseCase {
  constructor(
    @Inject(TASK_DETAIL_READ_MODEL) private readonly reads: TaskDetailReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(taskId: string): Promise<TaskDetailResult> {
    const detail = await this.reads.load(taskId);
    if (detail === null) {
      throw new NotFoundDomainException('Task not found');
    }
    const now = this.clock.now();

    const total = detail.checklist.length;
    const completed = detail.checklist.filter((item) => item.done).length;

    return {
      id: detail.id,
      title: detail.title,
      description: detail.description,
      status: detail.status,
      statusLabel: statusLabel(detail.status, detail.dueAt, now),
      priority: detail.priority,
      priorityLabel: priorityLabel(detail.priority),
      category: detail.category,
      categoryLabel: categoryLabel(detail.category),
      assigneeName: detail.assigneeName ?? detail.assigneeLabel,
      recipientName: detail.recipientName,
      createdByLabel: detail.createdByName ?? 'System (Auto-generated)',
      recurrenceLabel: detail.recurrenceLabel,
      estimatedMinutes: detail.estimatedMinutes,
      dueAt: detail.dueAt === null ? null : detail.dueAt.toISOString(),
      dueDateLabel: dueDateLabel(detail.dueAt, now),
      createdAt: detail.createdAt.toISOString(),
      completedAt: detail.completedAt === null ? null : detail.completedAt.toISOString(),
      progress: {
        completed,
        total,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      },
      checklist: detail.checklist.map((item) => ({
        id: item.id,
        label: item.label,
        done: item.done,
      })),
      comments: detail.comments.map((comment) => ({
        id: comment.id,
        authorName: comment.authorName ?? 'System',
        body: comment.body,
        at: comment.createdAt.toISOString(),
      })),
      activity: this.activity(detail),
      relatedVisit: this.relatedVisit(detail.relatedVisit),
      relatedTasks: detail.relatedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        statusLabel: statusLabel(task.status, task.dueAt, now),
        dueDateLabel: dueDateLabel(task.dueAt, now),
      })),
    };
  }

  /** The Activity History, derived from the task's lifecycle timestamps, newest first. */
  private activity(detail: TaskDetailRead): TaskActivityEntryResult[] {
    const entries: TaskActivityEntryResult[] = [
      { kind: 'CREATED', label: 'Task created', at: detail.createdAt.toISOString() },
    ];
    if (detail.assignedAt !== null) {
      const to = detail.assigneeName ?? detail.assigneeLabel;
      entries.push({
        kind: 'ASSIGNED',
        label: to === null ? 'Task assigned' : `Assigned to ${to}`,
        at: detail.assignedAt.toISOString(),
      });
    }
    if (detail.startedAt !== null) {
      entries.push({ kind: 'STARTED', label: 'Task started', at: detail.startedAt.toISOString() });
    }
    if (detail.completedAt !== null) {
      entries.push({
        kind: 'COMPLETED',
        label: 'Task completed',
        at: detail.completedAt.toISOString(),
      });
    }
    return entries.sort((a, b) => b.at.localeCompare(a.at));
  }

  private relatedVisit(visit: TaskDetailRead['relatedVisit']): TaskRelatedVisitResult | null {
    if (visit === null) {
      return null;
    }
    return {
      id: visit.id,
      visitLabel: relatedVisitLabel(visit.visitType) ?? 'Visit',
      dateLabel: longDateLabel(visit.scheduledDate),
      timeRange: `${minuteLabel(visit.startMinute)} - ${minuteLabel(visit.endMinute)}`,
      statusLabel: visitStatusLabel(visit.status),
      caregiverName: visit.caregiverName,
      recipientName: visit.recipientName,
      location: visit.location,
    };
  }
}

const VISIT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  MISSED: 'Missed',
};

function visitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status] ?? status;
}
