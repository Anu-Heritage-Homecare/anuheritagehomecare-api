import { Inject, Injectable } from '@nestjs/common';
import { TASK_CATEGORY_LABELS, TaskCategory } from '../../domain/task-category.enum';
import {
  CategorySettingResult,
  NotificationSettingResult,
  PrioritySettingResult,
  TaskSettingsResult,
} from '../dto/task-settings.result';
import {
  CategorySettingRow,
  NotificationSettingRow,
  PrioritySettingRow,
  TASK_SETTINGS_STORE,
  TaskSettingsStore,
} from '../ports/task-settings.store';
import {
  CATEGORY_DEFAULTS,
  CATEGORY_ORDER,
  NOTIFICATION_DEFAULTS,
  PRIORITY_DEFAULTS,
  PRIORITY_ORDER,
  channelsLabel,
} from '../task-settings.defaults';

/** Use case: the Task Settings screen (categories, priority levels, notifications). */
@Injectable()
export class GetTaskSettingsUseCase {
  constructor(@Inject(TASK_SETTINGS_STORE) private readonly store: TaskSettingsStore) {}

  async execute(): Promise<TaskSettingsResult> {
    const [categoryRows, counts, priorityRows, notificationRows] = await Promise.all([
      this.store.listCategorySettings(),
      this.store.categoryTaskCounts(),
      this.store.listPrioritySettings(),
      this.store.listNotificationSettings(),
    ]);

    const categoryOverrides = new Map(categoryRows.map((r) => [r.category, r]));
    const priorityOverrides = new Map(priorityRows.map((r) => [r.priority, r]));
    const notificationOverrides = new Map(notificationRows.map((r) => [r.key, r]));

    return {
      categories: CATEGORY_ORDER.map((category) =>
        this.category(category, categoryOverrides.get(category), counts.get(category) ?? 0),
      ),
      priorities: PRIORITY_ORDER.map((priority) =>
        this.priority(priority, priorityOverrides.get(priority)),
      ),
      notifications: NOTIFICATION_DEFAULTS.map((def) =>
        this.notification(def, notificationOverrides.get(def.key)),
      ),
    };
  }

  private category(
    category: TaskCategory,
    override: CategorySettingRow | undefined,
    tasksCount: number,
  ): CategorySettingResult {
    return {
      category,
      label: TASK_CATEGORY_LABELS[category],
      color: override?.color ?? CATEGORY_DEFAULTS[category].color,
      icon: override?.icon ?? null,
      autoAssignLabel: override?.autoAssignLabel ?? null,
      tasksCount,
      active: override?.active ?? true,
    };
  }

  private priority(
    priority: string,
    override: PrioritySettingRow | undefined,
  ): PrioritySettingResult {
    const def = PRIORITY_DEFAULTS[priority as keyof typeof PRIORITY_DEFAULTS];
    return {
      priority,
      level: def.level,
      label: override?.label ?? def.label,
      color: override?.color ?? def.color,
      slaHours: override?.slaHours ?? def.slaHours,
      escalation: override?.escalation ?? def.escalation,
      isDefault: override?.isDefault ?? def.isDefault,
    };
  }

  private notification(
    def: (typeof NOTIFICATION_DEFAULTS)[number],
    override: NotificationSettingRow | undefined,
  ): NotificationSettingResult {
    const channels = override?.channels ?? def.channels;
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      enabled: override?.enabled ?? def.enabled,
      channels,
      channelsLabel: channelsLabel(channels),
    };
  }
}
