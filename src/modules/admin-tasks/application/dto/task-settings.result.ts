export interface CategorySettingResult {
  category: string;
  label: string;
  color: string | null;
  icon: string | null;
  autoAssignLabel: string | null;
  tasksCount: number;
  active: boolean;
}

export interface PrioritySettingResult {
  priority: string;
  level: number;
  label: string;
  color: string | null;
  slaHours: number | null;
  escalation: string | null;
  isDefault: boolean;
}

export interface NotificationSettingResult {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: string[];
  channelsLabel: string;
}

export interface TaskSettingsResult {
  categories: CategorySettingResult[];
  priorities: PrioritySettingResult[];
  notifications: NotificationSettingResult[];
}
