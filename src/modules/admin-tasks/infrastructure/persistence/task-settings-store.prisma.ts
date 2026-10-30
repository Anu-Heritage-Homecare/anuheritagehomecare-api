import { Injectable } from '@nestjs/common';
import {
  TaskCategory as PrismaTaskCategory,
  TaskPriority as PrismaTaskPriority,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CategorySettingPatch,
  CategorySettingRow,
  NotificationSettingPatch,
  NotificationSettingRow,
  PrioritySettingPatch,
  PrioritySettingRow,
  TaskSettingsStore,
} from '../../application/ports/task-settings.store';

/** Prisma adapter for the task settings overlays. */
@Injectable()
export class TaskSettingsStorePrisma implements TaskSettingsStore {
  constructor(private readonly prisma: PrismaService) {}

  async listCategorySettings(): Promise<CategorySettingRow[]> {
    const rows = await this.prisma.taskCategorySetting.findMany();
    return rows.map((r) => ({
      category: String(r.category),
      color: r.color,
      icon: r.icon,
      autoAssignLabel: r.autoAssignLabel,
      active: r.active,
    }));
  }

  async categoryTaskCounts(): Promise<Map<string, number>> {
    const groups = await this.prisma.operationalTask.groupBy({
      by: ['category'],
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [String(g.category), g._count._all]));
  }

  async upsertCategorySetting(
    category: string,
    patch: CategorySettingPatch,
    now: Date,
  ): Promise<void> {
    const key = category as PrismaTaskCategory;
    await this.prisma.taskCategorySetting.upsert({
      where: { category: key },
      create: {
        category: key,
        color: patch.color ?? null,
        icon: patch.icon ?? null,
        autoAssignLabel: patch.autoAssignLabel ?? null,
        active: patch.active ?? true,
      },
      update: {
        color: patch.color,
        icon: patch.icon,
        autoAssignLabel: patch.autoAssignLabel,
        active: patch.active,
        updatedAt: now,
      },
    });
  }

  async listPrioritySettings(): Promise<PrioritySettingRow[]> {
    const rows = await this.prisma.taskPrioritySetting.findMany();
    return rows.map((r) => ({
      priority: String(r.priority),
      color: r.color,
      label: r.label,
      slaHours: r.slaHours,
      escalation: r.escalation,
      isDefault: r.isDefault,
    }));
  }

  async clearPriorityDefaults(except: string, now: Date): Promise<void> {
    await this.prisma.taskPrioritySetting.updateMany({
      where: { priority: { not: except as PrismaTaskPriority }, isDefault: true },
      data: { isDefault: false, updatedAt: now },
    });
  }

  async upsertPrioritySetting(
    priority: string,
    patch: PrioritySettingPatch,
    now: Date,
  ): Promise<void> {
    const key = priority as PrismaTaskPriority;
    await this.prisma.taskPrioritySetting.upsert({
      where: { priority: key },
      create: {
        priority: key,
        color: patch.color ?? null,
        label: patch.label ?? null,
        slaHours: patch.slaHours ?? null,
        escalation: patch.escalation ?? null,
        isDefault: patch.isDefault ?? false,
      },
      update: {
        color: patch.color,
        label: patch.label,
        slaHours: patch.slaHours,
        escalation: patch.escalation,
        isDefault: patch.isDefault,
        updatedAt: now,
      },
    });
  }

  async listNotificationSettings(): Promise<NotificationSettingRow[]> {
    const rows = await this.prisma.taskNotificationSetting.findMany();
    return rows.map((r) => ({ key: r.key, enabled: r.enabled, channels: r.channels }));
  }

  async upsertNotificationSetting(
    key: string,
    patch: NotificationSettingPatch,
    now: Date,
  ): Promise<void> {
    await this.prisma.taskNotificationSetting.upsert({
      where: { key },
      create: {
        key,
        enabled: patch.enabled ?? true,
        channels: patch.channels ?? [],
      },
      update: {
        enabled: patch.enabled,
        channels: patch.channels,
        updatedAt: now,
      },
    });
  }
}
