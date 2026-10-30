import {
  TaskCategory as PrismaTaskCategory,
  TaskPriority as PrismaTaskPriority,
  TaskTemplate as PrismaTaskTemplate,
} from '@prisma/client';
import { TaskCategory } from '../../domain/task-category.enum';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskTemplate } from '../../domain/task-template.entity';

const TO_DOMAIN_CATEGORY: Record<PrismaTaskCategory, TaskCategory> = {
  CARE_ACTIVITY: TaskCategory.CareActivity,
  MEDICATION: TaskCategory.Medication,
  DOCUMENTATION: TaskCategory.Documentation,
  SCHEDULING: TaskCategory.Scheduling,
  COMPLIANCE: TaskCategory.Compliance,
  ADMINISTRATIVE: TaskCategory.Administrative,
  OTHER: TaskCategory.Other,
};

const TO_PERSISTENCE_CATEGORY: Record<TaskCategory, PrismaTaskCategory> = {
  [TaskCategory.CareActivity]: 'CARE_ACTIVITY',
  [TaskCategory.Medication]: 'MEDICATION',
  [TaskCategory.Documentation]: 'DOCUMENTATION',
  [TaskCategory.Scheduling]: 'SCHEDULING',
  [TaskCategory.Compliance]: 'COMPLIANCE',
  [TaskCategory.Administrative]: 'ADMINISTRATIVE',
  [TaskCategory.Other]: 'OTHER',
};

const TO_DOMAIN_PRIORITY: Record<PrismaTaskPriority, TaskPriority> = {
  LOW: TaskPriority.Low,
  MEDIUM: TaskPriority.Medium,
  HIGH: TaskPriority.High,
  URGENT: TaskPriority.Urgent,
};

const TO_PERSISTENCE_PRIORITY: Record<TaskPriority, PrismaTaskPriority> = {
  [TaskPriority.Low]: 'LOW',
  [TaskPriority.Medium]: 'MEDIUM',
  [TaskPriority.High]: 'HIGH',
  [TaskPriority.Urgent]: 'URGENT',
};

/** Translates between the Prisma TaskTemplate row and the entity. */
export class TaskTemplateMapper {
  static toDomain(row: PrismaTaskTemplate): TaskTemplate {
    return TaskTemplate.rehydrate(row.id, {
      name: row.name,
      title: row.title,
      description: row.description,
      category: TO_DOMAIN_CATEGORY[row.category],
      priority: TO_DOMAIN_PRIORITY[row.priority],
      defaultAssigneeLabel: row.defaultAssigneeLabel,
      checklistItems: row.checklistItems,
      scheduleLabel: row.scheduleLabel,
      estimatedMinutes: row.estimatedMinutes,
      active: row.active,
      createdByAdminId: row.createdByAdminId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(template: TaskTemplate): PrismaTaskTemplate {
    return {
      id: template.id,
      name: template.name,
      title: template.title,
      description: template.description,
      category: TO_PERSISTENCE_CATEGORY[template.category],
      priority: TO_PERSISTENCE_PRIORITY[template.priority],
      defaultAssigneeLabel: template.defaultAssigneeLabel,
      checklistItems: template.checklistItems,
      scheduleLabel: template.scheduleLabel,
      estimatedMinutes: template.estimatedMinutes,
      active: template.active,
      createdByAdminId: template.createdByAdminId,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
