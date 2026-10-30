import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  RelatedTaskRead,
  RelatedVisitRead,
  TaskDetailRead,
  TaskDetailReadModel,
} from '../../application/ports/task-detail-read.port';

const NOT_DONE = ['OPEN', 'IN_PROGRESS'] as const;
const RELATED_TASKS_LIMIT = 5;

/** Prisma read model for the task detail screen. */
@Injectable()
export class TaskDetailReadPrisma implements TaskDetailReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async load(taskId: string): Promise<TaskDetailRead | null> {
    const task = await this.prisma.operationalTask.findUnique({
      where: { id: taskId },
      include: {
        checklistItems: { orderBy: { position: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (task === null) {
      return null;
    }

    const adminIds = [
      ...new Set(
        [
          task.createdByAdminId,
          task.assignedToAdminId,
          ...task.comments.map((c) => c.authorAdminId),
        ].filter((id): id is string => id !== null),
      ),
    ];

    const [adminNames, recipient, relatedVisit, relatedTasks] = await Promise.all([
      this.adminNames(adminIds),
      task.relatedCareRecipientId === null
        ? Promise.resolve(null)
        : this.prisma.careRecipient.findUnique({
            where: { id: task.relatedCareRecipientId },
            select: { name: true },
          }),
      this.relatedVisit(task.relatedVisitId),
      this.relatedTasks(task.relatedCareRecipientId, task.id),
    ]);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: String(task.status),
      priority: String(task.priority),
      category: String(task.category),
      assignedToAdminId: task.assignedToAdminId,
      assigneeName:
        task.assignedToAdminId === null ? null : (adminNames.get(task.assignedToAdminId) ?? null),
      assigneeLabel: task.assigneeLabel,
      createdByName:
        task.createdByAdminId === null ? null : (adminNames.get(task.createdByAdminId) ?? null),
      relatedCareRecipientId: task.relatedCareRecipientId,
      recipientName: recipient?.name ?? null,
      recurrenceLabel: task.recurrenceLabel,
      estimatedMinutes: task.estimatedMinutes,
      dueAt: task.dueAt,
      startedAt: task.startedAt,
      assignedAt: task.assignedAt,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      checklist: task.checklistItems.map((item) => ({
        id: item.id,
        label: item.label,
        done: item.done,
        completedAt: item.completedAt,
      })),
      comments: task.comments.map((comment) => ({
        id: comment.id,
        authorAdminId: comment.authorAdminId,
        authorName:
          comment.authorAdminId === null ? null : (adminNames.get(comment.authorAdminId) ?? null),
        body: comment.body,
        createdAt: comment.createdAt,
      })),
      relatedVisit,
      relatedTasks,
    };
  }

  private async relatedVisit(visitId: string | null): Promise<RelatedVisitRead | null> {
    if (visitId === null) {
      return null;
    }
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        sequence: true,
        visitType: true,
        scheduledDate: true,
        startMinute: true,
        endMinute: true,
        status: true,
        caregiverId: true,
        careRecipientId: true,
      },
    });
    if (visit === null) {
      return null;
    }
    const [caregiver, recipient] = await Promise.all([
      visit.caregiverId === null
        ? Promise.resolve(null)
        : this.prisma.user.findUnique({
            where: { id: visit.caregiverId },
            select: { firstName: true, lastName: true },
          }),
      this.prisma.careRecipient.findUnique({
        where: { id: visit.careRecipientId },
        select: { name: true, fullAddress: true },
      }),
    ]);
    return {
      id: visit.id,
      sequence: visit.sequence,
      visitType: String(visit.visitType),
      scheduledDate: visit.scheduledDate,
      startMinute: visit.startMinute,
      endMinute: visit.endMinute,
      status: String(visit.status),
      caregiverName:
        caregiver === null ? null : `${caregiver.firstName} ${caregiver.lastName}`.trim(),
      recipientName: recipient?.name ?? null,
      location: recipient?.fullAddress ?? null,
    };
  }

  private async relatedTasks(
    recipientId: string | null,
    excludeTaskId: string,
  ): Promise<RelatedTaskRead[]> {
    if (recipientId === null) {
      return [];
    }
    const rows = await this.prisma.operationalTask.findMany({
      where: {
        relatedCareRecipientId: recipientId,
        id: { not: excludeTaskId },
        status: { in: [...NOT_DONE] },
      },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: RELATED_TASKS_LIMIT,
      select: { id: true, title: true, status: true, dueAt: true },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: String(row.status),
      dueAt: row.dueAt,
    }));
  }

  private async adminNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.adminUser.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`.trim()]));
  }
}
