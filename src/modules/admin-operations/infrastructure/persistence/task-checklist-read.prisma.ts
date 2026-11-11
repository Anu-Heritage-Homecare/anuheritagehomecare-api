import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  TaskChecklistReadPort,
  TaskChecklistSummary,
} from '../../application/ports/task-checklist-read.port';

/**
 * Reads active task templates (owned by the admin-tasks context) as checklist
 * summaries. A read only cross context view; the task count is the number of
 * default checklist lines on the template.
 */
@Injectable()
export class TaskChecklistReadPrisma implements TaskChecklistReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<TaskChecklistSummary[]> {
    const rows = await this.prisma.taskTemplate.findMany({
      where: { active: true },
      select: { id: true, name: true, checklistItems: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      taskCount: row.checklistItems.length,
    }));
  }
}
