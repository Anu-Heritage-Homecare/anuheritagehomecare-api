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
        assignedToAdminId: row.assignedToAdminId,
        relatedCareRecipientId: row.relatedCareRecipientId,
        dueAt: row.dueAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
      },
    });
  }

  async findById(id: string): Promise<OperationalTask | null> {
    const row = await this.prisma.operationalTask.findUnique({ where: { id } });
    return row ? OperationalTaskMapper.toDomain(row) : null;
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
