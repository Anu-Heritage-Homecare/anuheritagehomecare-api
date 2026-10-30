import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TaskCategory as PrismaTaskCategory,
  TaskPriority as PrismaTaskPriority,
  TaskStatus as PrismaTaskStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  TaskListRow,
  TasksKpiCounts,
  TasksListFilter,
  TasksReadModel,
  TasksTabCounts,
} from '../../application/ports/tasks-read.port';

const NOT_DONE: PrismaTaskStatus[] = ['OPEN', 'IN_PROGRESS'];

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function nextUtcDay(value: Date): Date {
  return new Date(startOfUtcDay(value).getTime() + 86_400_000);
}

/** Prisma read model for the Tasks screen (list, KPIs, tab counts, enrichment). */
@Injectable()
export class TasksReadPrisma implements TasksReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(
    filter: TasksListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ rows: TaskListRow[]; total: number }> {
    const where = this.whereFor(filter);

    const [total, tasks] = await Promise.all([
      this.prisma.operationalTask.count({ where }),
      this.prisma.operationalTask.findMany({
        where,
        orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const adminIds = [
      ...new Set(tasks.map((t) => t.assignedToAdminId).filter((id): id is string => id !== null)),
    ];
    const recipientIds = [
      ...new Set(
        tasks.map((t) => t.relatedCareRecipientId).filter((id): id is string => id !== null),
      ),
    ];
    const visitIds = [
      ...new Set(tasks.map((t) => t.relatedVisitId).filter((id): id is string => id !== null)),
    ];

    const [adminNames, recipientNames, visits] = await Promise.all([
      this.adminNames(adminIds),
      this.recipientNames(recipientIds),
      this.visits(visitIds),
    ]);

    const rows = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: String(t.status),
      priority: String(t.priority),
      category: String(t.category),
      assignedToAdminId: t.assignedToAdminId,
      assigneeLabel: t.assigneeLabel,
      assigneeName:
        t.assignedToAdminId === null ? null : (adminNames.get(t.assignedToAdminId) ?? null),
      relatedCareRecipientId: t.relatedCareRecipientId,
      recipientName:
        t.relatedCareRecipientId === null
          ? null
          : (recipientNames.get(t.relatedCareRecipientId) ?? null),
      relatedVisitId: t.relatedVisitId,
      visitSequence: t.relatedVisitId === null ? null : (visits.get(t.relatedVisitId)?.seq ?? null),
      visitType: t.relatedVisitId === null ? null : (visits.get(t.relatedVisitId)?.type ?? null),
      dueAt: t.dueAt,
      completedAt: t.completedAt,
    }));

    return { rows, total };
  }

  async kpis(now: Date): Promise<TasksKpiCounts> {
    const todayStart = startOfUtcDay(now);
    const todayEnd = nextUtcDay(now);
    const [openTasks, completedToday, overdue, highPriority, dueToday, totalTasks, completedTotal] =
      await Promise.all([
        this.prisma.operationalTask.count({ where: { status: { in: NOT_DONE } } }),
        this.prisma.operationalTask.count({
          where: { status: 'DONE', completedAt: { gte: todayStart, lt: todayEnd } },
        }),
        this.prisma.operationalTask.count({
          where: { status: { in: NOT_DONE }, dueAt: { lt: todayStart } },
        }),
        this.prisma.operationalTask.count({
          where: { status: { in: NOT_DONE }, priority: { in: ['HIGH', 'URGENT'] } },
        }),
        this.prisma.operationalTask.count({
          where: { status: { in: NOT_DONE }, dueAt: { gte: todayStart, lt: todayEnd } },
        }),
        this.prisma.operationalTask.count(),
        this.prisma.operationalTask.count({ where: { status: 'DONE' } }),
      ]);
    return {
      openTasks,
      completedToday,
      overdue,
      highPriority,
      dueToday,
      totalTasks,
      completedTotal,
    };
  }

  async tabCounts(now: Date): Promise<TasksTabCounts> {
    const todayStart = startOfUtcDay(now);
    const todayEnd = nextUtcDay(now);
    const [all, today, overdue, completed] = await Promise.all([
      this.prisma.operationalTask.count(),
      this.prisma.operationalTask.count({
        where: { status: { in: NOT_DONE }, dueAt: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.operationalTask.count({
        where: { status: { in: NOT_DONE }, dueAt: { lt: todayStart } },
      }),
      this.prisma.operationalTask.count({ where: { status: 'DONE' } }),
    ]);
    return { all, today, overdue, completed };
  }

  private whereFor(filter: TasksListFilter): Prisma.OperationalTaskWhereInput {
    const todayStart = startOfUtcDay(filter.now);
    const todayEnd = nextUtcDay(filter.now);
    const where: Prisma.OperationalTaskWhereInput = {};

    switch (filter.tab) {
      case 'TODAY':
        where.status = { in: NOT_DONE };
        where.dueAt = { gte: todayStart, lt: todayEnd };
        break;
      case 'OVERDUE':
        where.status = { in: NOT_DONE };
        where.dueAt = { lt: todayStart };
        break;
      case 'COMPLETED':
        where.status = 'DONE';
        break;
      default:
        break;
    }

    if (filter.status !== null) {
      where.status = filter.status as PrismaTaskStatus;
    }
    if (filter.priority !== null) {
      where.priority = filter.priority as PrismaTaskPriority;
    }
    if (filter.category !== null) {
      where.category = filter.category as PrismaTaskCategory;
    }
    if (filter.assignedToAdminId !== null) {
      where.assignedToAdminId = filter.assignedToAdminId;
    }
    if (filter.assigneeLabel !== null) {
      where.assigneeLabel = { contains: filter.assigneeLabel, mode: 'insensitive' };
    }
    if (filter.search !== null) {
      where.title = { contains: filter.search, mode: 'insensitive' };
    }
    return where;
  }

  private async adminNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.adminUser.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
  }

  private async recipientNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.careRecipient.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  private async visits(ids: string[]): Promise<Map<string, { seq: number; type: string }>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.visit.findMany({
      where: { id: { in: ids } },
      select: { id: true, sequence: true, visitType: true },
    });
    return new Map(rows.map((r) => [r.id, { seq: r.sequence, type: String(r.visitType) }]));
  }
}
