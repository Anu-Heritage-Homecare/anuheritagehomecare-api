import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { OperationalTask } from '../../domain/operational-task.entity';
import { OperationalTaskRepository } from '../../domain/operational-task.repository';
import { TaskStatus } from '../../domain/task-status.enum';
import { OperationalTaskMapper } from './operational-task.mapper';

const TO_PRISMA_STATUS: Record<TaskStatus, PrismaTaskStatus> = {
  [TaskStatus.Open]: 'OPEN',
  [TaskStatus.InProgress]: 'IN_PROGRESS',
  [TaskStatus.Done]: 'DONE',
};

/** Prisma backed adapter for the OperationalTaskRepository port. */
@Injectable()
export class OperationalTaskPrismaRepository implements OperationalTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(task: OperationalTask): Promise<void> {
    const row = OperationalTaskMapper.toPersistence(task);
    await this.prisma.operationalTask.upsert({
      where: { id: row.id },
      create: row,
      update: {
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        assignedToAdminId: row.assignedToAdminId,
        assigneeLabel: row.assigneeLabel,
        relatedCareRecipientId: row.relatedCareRecipientId,
        relatedVisitId: row.relatedVisitId,
        dueAt: row.dueAt,
        recurrenceLabel: row.recurrenceLabel,
        estimatedMinutes: row.estimatedMinutes,
        startedAt: row.startedAt,
        assignedAt: row.assignedAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.operationalTask.delete({ where: { id } });
  }

  async findById(id: string): Promise<OperationalTask | null> {
    const row = await this.prisma.operationalTask.findUnique({ where: { id } });
    return row ? OperationalTaskMapper.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<OperationalTask[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.operationalTask.findMany({ where: { id: { in: ids } } });
    return rows.map((row) => OperationalTaskMapper.toDomain(row));
  }

  async list(statusFilter: TaskStatus | null, limit: number): Promise<OperationalTask[]> {
    const where: Prisma.OperationalTaskWhereInput =
      statusFilter === null ? {} : { status: TO_PRISMA_STATUS[statusFilter] };
    const rows = await this.prisma.operationalTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => OperationalTaskMapper.toDomain(row));
  }

  async countOpen(): Promise<number> {
    return this.prisma.operationalTask.count({
      where: { status: { not: PrismaTaskStatus.DONE } },
    });
  }
}
