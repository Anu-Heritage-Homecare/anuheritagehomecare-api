import { TaskCategory } from '../domain/task-category.enum';
import { TaskPriority } from '../domain/task-priority.enum';

/** The allowed notification delivery channels. */
export const NOTIFICATION_CHANNELS = ['PUSH', 'EMAIL', 'SMS', 'IN_APP'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  PUSH: 'Push',
  EMAIL: 'Email',
  SMS: 'SMS',
  IN_APP: 'In-app',
};

export function channelsLabel(channels: string[]): string {
  return channels.map((c) => CHANNEL_LABELS[c as NotificationChannel] ?? c).join(' + ');
}

export interface CategoryDefault {
  color: string;
}

/** Default display colour per category (overridable). Icons default to none. */
export const CATEGORY_DEFAULTS: Record<TaskCategory, CategoryDefault> = {
  [TaskCategory.CareActivity]: { color: '#3B82F6' },
  [TaskCategory.Medication]: { color: '#F59E0B' },
  [TaskCategory.Documentation]: { color: '#3B82F6' },
  [TaskCategory.Scheduling]: { color: '#8B5CF6' },
  [TaskCategory.Compliance]: { color: '#EF4444' },
  [TaskCategory.Administrative]: { color: '#6B7280' },
  [TaskCategory.Other]: { color: '#6B7280' },
};

/** Category enum values in display order. */
export const CATEGORY_ORDER: TaskCategory[] = [
  TaskCategory.CareActivity,
  TaskCategory.Medication,
  TaskCategory.Documentation,
  TaskCategory.Scheduling,
  TaskCategory.Compliance,
  TaskCategory.Administrative,
  TaskCategory.Other,
];

export interface PriorityDefault {
  level: number;
  label: string;
  color: string;
  slaHours: number;
  escalation: string;
  isDefault: boolean;
}

// The enum has four priorities, so the mockup's five levels collapse to four
// (Critical is URGENT; the mockup's "Normal" merges into Low/Medium).
export const PRIORITY_DEFAULTS: Record<TaskPriority, PriorityDefault> = {
  [TaskPriority.Urgent]: {
    level: 1,
    label: 'Critical',
    color: '#EF4444',
    slaHours: 2,
    escalation: 'Immediate to Manager',
    isDefault: false,
  },
  [TaskPriority.High]: {
    level: 2,
    label: 'High',
    color: '#F97316',
    slaHours: 4,
    escalation: 'After 2 hours',
    isDefault: false,
  },
  [TaskPriority.Medium]: {
    level: 3,
    label: 'Medium',
    color: '#F59E0B',
    slaHours: 8,
    escalation: 'After 4 hours',
    isDefault: true,
  },
  [TaskPriority.Low]: {
    level: 4,
    label: 'Low',
    color: '#3B82F6',
    slaHours: 24,
    escalation: 'After 12 hours',
    isDefault: false,
  },
};

/** Priority enum values highest first. */
export const PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.Urgent,
  TaskPriority.High,
  TaskPriority.Medium,
  TaskPriority.Low,
];

export interface NotificationDefault {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: NotificationChannel[];
}

/** The fixed set of task notification preferences with their defaults. */
export const NOTIFICATION_DEFAULTS: NotificationDefault[] = [
  {
    key: 'TASK_ASSIGNED',
    title: 'Task assigned to you',
    description: 'When a task is assigned to you',
    enabled: true,
    channels: ['PUSH', 'EMAIL'],
  },
  {
    key: 'DUE_SOON',
    title: 'Task due in 1 hour',
    description: 'A reminder shortly before a task is due',
    enabled: true,
    channels: ['PUSH'],
  },
  {
    key: 'OVERDUE',
    title: 'Task overdue',
    description: 'When a task passes its due time',
    enabled: true,
    channels: ['PUSH', 'EMAIL', 'SMS'],
  },
  {
    key: 'COMPLETED_BY_TEAM',
    title: 'Task completed by team member',
    description: 'When a teammate completes a task',
    enabled: false,
    channels: ['IN_APP'],
  },
  {
    key: 'DAILY_SUMMARY',
    title: 'Daily task summary',
    description: 'A daily digest of your tasks',
    enabled: true,
    channels: ['EMAIL'],
  },
  {
    key: 'WEEKLY_REPORT',
    title: 'Weekly completion report',
    description: 'A weekly completion report',
    enabled: true,
    channels: ['EMAIL'],
  },
];

export const NOTIFICATION_KEYS = NOTIFICATION_DEFAULTS.map((n) => n.key);
