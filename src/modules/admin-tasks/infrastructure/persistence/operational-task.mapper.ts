import {
  OperationalTask as PrismaOperationalTask,
  TaskCategory as PrismaTaskCategory,
  TaskPriority as PrismaTaskPriority,
  TaskStatus as PrismaTaskStatus,
} from '@prisma/client';
import { OperationalTask } from '../../domain/operational-task.entity';
import { TaskCategory } from '../../domain/task-category.enum';
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
      category: OperationalTaskMapper.TO_DOMAIN_CATEGORY[row.category],
      assignedToAdminId: row.assignedToAdminId,
      assigneeLabel: row.assigneeLabel,
      createdByAdminId: row.createdByAdminId,
      relatedCareRecipientId: row.relatedCareRecipientId,
      relatedVisitId: row.relatedVisitId,
      dueAt: row.dueAt,
      recurrenceLabel: row.recurrenceLabel,
      estimatedMinutes: row.estimatedMinutes,
      startedAt: row.startedAt,
      assignedAt: row.assignedAt,
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
      category: OperationalTaskMapper.TO_PERSISTENCE_CATEGORY[task.category],
      assignedToAdminId: task.assignedToAdminId,
      assigneeLabel: task.assigneeLabel,
      createdByAdminId: task.createdByAdminId,
      relatedCareRecipientId: task.relatedCareRecipientId,
      relatedVisitId: task.relatedVisitId,
      dueAt: task.dueAt,
      recurrenceLabel: task.recurrenceLabel,
      estimatedMinutes: task.estimatedMinutes,
      startedAt: task.startedAt,
      assignedAt: task.assignedAt,
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

  private static readonly TO_DOMAIN_CATEGORY: Record<PrismaTaskCategory, TaskCategory> = {
    CARE_ACTIVITY: TaskCategory.CareActivity,
    MEDICATION: TaskCategory.Medication,
    DOCUMENTATION: TaskCategory.Documentation,
    SCHEDULING: TaskCategory.Scheduling,
    COMPLIANCE: TaskCategory.Compliance,
    ADMINISTRATIVE: TaskCategory.Administrative,
    OTHER: TaskCategory.Other,
  };

  private static readonly TO_PERSISTENCE_CATEGORY: Record<TaskCategory, PrismaTaskCategory> = {
    [TaskCategory.CareActivity]: 'CARE_ACTIVITY',
    [TaskCategory.Medication]: 'MEDICATION',
    [TaskCategory.Documentation]: 'DOCUMENTATION',
    [TaskCategory.Scheduling]: 'SCHEDULING',
    [TaskCategory.Compliance]: 'COMPLIANCE',
    [TaskCategory.Administrative]: 'ADMINISTRATIVE',
    [TaskCategory.Other]: 'OTHER',
  };
}
