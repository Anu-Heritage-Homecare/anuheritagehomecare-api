import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  CategorySettingPatch,
  NotificationSettingPatch,
  PrioritySettingPatch,
  TASK_SETTINGS_STORE,
  TaskSettingsStore,
} from '../ports/task-settings.store';

/** Update one task category's display overlay (colour, icon, auto-assign, active). */
@Injectable()
export class UpdateCategorySettingUseCase {
  constructor(
    @Inject(TASK_SETTINGS_STORE) private readonly store: TaskSettingsStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(category: string, patch: CategorySettingPatch): Promise<void> {
    await this.store.upsertCategorySetting(category, patch, this.clock.now());
  }
}

/** Update one priority level (colour, label, SLA, escalation, default). */
@Injectable()
export class UpdatePrioritySettingUseCase {
  constructor(
    @Inject(TASK_SETTINGS_STORE) private readonly store: TaskSettingsStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(priority: string, patch: PrioritySettingPatch): Promise<void> {
    const now = this.clock.now();
    // Only one priority may be the default; clear the others first.
    if (patch.isDefault === true) {
      await this.store.clearPriorityDefaults(priority, now);
    }
    await this.store.upsertPrioritySetting(priority, patch, now);
  }
}

/** Update one notification preference (enabled, channels). */
@Injectable()
export class UpdateNotificationSettingUseCase {
  constructor(
    @Inject(TASK_SETTINGS_STORE) private readonly store: TaskSettingsStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(key: string, patch: NotificationSettingPatch): Promise<void> {
    await this.store.upsertNotificationSetting(key, patch, this.clock.now());
  }
}
