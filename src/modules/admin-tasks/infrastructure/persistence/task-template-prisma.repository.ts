import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { TaskTemplate } from '../../domain/task-template.entity';
import { TaskTemplateRepository } from '../../domain/task-template.repository';
import { TaskTemplateMapper } from './task-template.mapper';

/** Prisma backed adapter for the TaskTemplateRepository port. */
@Injectable()
export class TaskTemplatePrismaRepository implements TaskTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(template: TaskTemplate): Promise<void> {
    const row = TaskTemplateMapper.toPersistence(template);
    await this.prisma.taskTemplate.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        title: row.title,
        description: row.description,
        category: row.category,
        priority: row.priority,
        defaultAssigneeLabel: row.defaultAssigneeLabel,
        checklistItems: row.checklistItems,
        scheduleLabel: row.scheduleLabel,
        estimatedMinutes: row.estimatedMinutes,
        active: row.active,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<TaskTemplate | null> {
    const row = await this.prisma.taskTemplate.findUnique({ where: { id } });
    return row ? TaskTemplateMapper.toDomain(row) : null;
  }

  async list(): Promise<TaskTemplate[]> {
    const rows = await this.prisma.taskTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row) => TaskTemplateMapper.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskTemplate.deleteMany({ where: { id } });
  }
}
