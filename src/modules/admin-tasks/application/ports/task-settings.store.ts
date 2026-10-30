export interface CategorySettingRow {
  category: string;
  color: string | null;
  icon: string | null;
  autoAssignLabel: string | null;
  active: boolean;
}

export interface PrioritySettingRow {
  priority: string;
  color: string | null;
  label: string | null;
  slaHours: number | null;
  escalation: string | null;
  isDefault: boolean;
}

export interface NotificationSettingRow {
  key: string;
  enabled: boolean;
  channels: string[];
}

export interface CategorySettingPatch {
  color?: string | null;
  icon?: string | null;
  autoAssignLabel?: string | null;
  active?: boolean;
}

export interface PrioritySettingPatch {
  color?: string | null;
  label?: string | null;
  slaHours?: number | null;
  escalation?: string | null;
  isDefault?: boolean;
}

export interface NotificationSettingPatch {
  enabled?: boolean;
  channels?: string[];
}

/**
 * Read and write the task settings overlays. Rows hold stored overrides only; the
 * use cases merge them with the defaults. Writes upsert by the natural key.
 */
export interface TaskSettingsStore {
  listCategorySettings(): Promise<CategorySettingRow[]>;
  /** Live task counts grouped by category. */
  categoryTaskCounts(): Promise<Map<string, number>>;
  upsertCategorySetting(category: string, patch: CategorySettingPatch, now: Date): Promise<void>;

  listPrioritySettings(): Promise<PrioritySettingRow[]>;
  /** Clear isDefault on every priority except the given one (single default invariant). */
  clearPriorityDefaults(except: string, now: Date): Promise<void>;
  upsertPrioritySetting(priority: string, patch: PrioritySettingPatch, now: Date): Promise<void>;

  listNotificationSettings(): Promise<NotificationSettingRow[]>;
  upsertNotificationSetting(key: string, patch: NotificationSettingPatch, now: Date): Promise<void>;
}

export const TASK_SETTINGS_STORE = Symbol('TASK_SETTINGS_STORE');
