import {
  OperationalTask as PrismaOperationalTask,
  TaskPriority as PrismaTaskPriority,
  TaskStatus as PrismaTaskStatus,
} from '@prisma/client';
import { OperationalTask } from '../../domain/operational-task.entity';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskStatus } from '../../domain/task-status.enum';

/** Translates between the Prisma OperationalTask row and the aggregate. */
export class OperationalTaskMapper {
  static toDomain(row: PrismaOperationalTask): OperationalTask {
    return OperationalTask.rehydrate(row.id, {
      title: row.title,
      description: row.description,
      status: OperationalTaskMapper.TO_DOMAIN_STATUS[row.status],
      priority: OperationalTaskMapper.TO_DOMAIN_PRIORITY[row.priority],
      assignedToAdminId: row.assignedToAdminId,
      createdByAdminId: row.createdByAdminId,
      relatedCareRecipientId: row.relatedCareRecipientId,
      dueAt: row.dueAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    });
  }

  static toPersistence(task: OperationalTask): PrismaOperationalTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: OperationalTaskMapper.TO_PERSISTENCE_STATUS[task.status],
      priority: OperationalTaskMapper.TO_PERSISTENCE_PRIORITY[task.priority],
      assignedToAdminId: task.assignedToAdminId,
      createdByAdminId: task.createdByAdminId,
      relatedCareRecipientId: task.relatedCareRecipientId,
      dueAt: task.dueAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
    };
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaTaskStatus, TaskStatus> = {
    OPEN: TaskStatus.Open,
    IN_PROGRESS: TaskStatus.InProgress,
    DONE: TaskStatus.Done,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<TaskStatus, PrismaTaskStatus> = {
    [TaskStatus.Open]: 'OPEN',
    [TaskStatus.InProgress]: 'IN_PROGRESS',
    [TaskStatus.Done]: 'DONE',
  };

  private static readonly TO_DOMAIN_PRIORITY: Record<PrismaTaskPriority, TaskPriority> = {
    LOW: TaskPriority.Low,
    MEDIUM: TaskPriority.Medium,
    HIGH: TaskPriority.High,
    URGENT: TaskPriority.Urgent,
  };

  private static readonly TO_PERSISTENCE_PRIORITY: Record<TaskPriority, PrismaTaskPriority> = {
    [TaskPriority.Low]: 'LOW',
    [TaskPriority.Medium]: 'MEDIUM',
    [TaskPriority.High]: 'HIGH',
    [TaskPriority.Urgent]: 'URGENT',
  };
}
