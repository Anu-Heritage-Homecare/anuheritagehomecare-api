import { OperationalTask } from '../../domain/operational-task.entity';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskStatus } from '../../domain/task-status.enum';

/** An operational task as the tasks list and dashboard need it. */
export interface TaskResult {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToAdminId: string | null;
  relatedCareRecipientId: string | null;
  dueAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

export function toTaskResult(task: OperationalTask): TaskResult {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignedToAdminId: task.assignedToAdminId,
    relatedCareRecipientId: task.relatedCareRecipientId,
    dueAt: task.dueAt,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}
