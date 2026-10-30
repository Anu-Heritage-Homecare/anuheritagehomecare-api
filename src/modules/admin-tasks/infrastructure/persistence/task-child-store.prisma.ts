import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { TaskChildStore } from '../../application/ports/task-child.store';

/** Prisma adapter for a task's checklist lines and comments. */
@Injectable()
export class TaskChildStorePrisma implements TaskChildStore {
  constructor(private readonly prisma: PrismaService) {}

  async createChecklistItems(taskId: string, labels: string[], now: Date): Promise<void> {
    await this.prisma.taskChecklistItem.createMany({
      data: labels.map((label, index) => ({
        taskId,
        label: label.slice(0, 200),
        position: index,
        createdAt: now,
      })),
    });
  }

  async findChecklistItemTaskId(itemId: string): Promise<string | null> {
    const item = await this.prisma.taskChecklistItem.findUnique({
      where: { id: itemId },
      select: { taskId: true },
    });
    return item?.taskId ?? null;
  }

  async setChecklistItemDone(itemId: string, done: boolean, now: Date): Promise<void> {
    await this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: { done, completedAt: done ? now : null },
    });
  }

  async addComment(
    taskId: string,
    authorAdminId: string | null,
    body: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.taskComment.create({
      data: { taskId, authorAdminId, body, createdAt: now },
    });
  }
}
