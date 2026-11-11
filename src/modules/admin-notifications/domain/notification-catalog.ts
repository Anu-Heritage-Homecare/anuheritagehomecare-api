import { NotificationChannel } from './notification-channel.enum';

/**
 * The fixed catalog of notification types per channel and the emergency triggers.
 * The screen renders the catalog as its toggle rows; saved toggles override the
 * default. Because the catalog is the source of truth for valid keys, a toggle can
 * never be saved for a type the system does not know about.
 */
export interface NotificationTypeDefinition {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const NOTIFICATION_CATALOG: Record<NotificationChannel, NotificationTypeDefinition[]> = {
  [NotificationChannel.Email]: [
    {
      key: 'new_visit_assigned',
      label: 'New visit assigned',
      description: 'Notify caregiver when a new visit is confirmed',
      defaultEnabled: true,
    },
    {
      key: 'visit_cancelled',
      label: 'Visit cancelled',
      description: 'Send immediate update if a visit schedule changes',
      defaultEnabled: true,
    },
    {
      key: 'payment_received',
      label: 'Payment received',
      description: 'Send confirmation on invoice settlements',
      defaultEnabled: true,
    },
    {
      key: 'invoice_overdue',
      label: 'Invoice overdue',
      description: 'Alert when net payment window passes',
      defaultEnabled: true,
    },
    {
      key: 'new_message',
      label: 'New message',
      description: 'Direct alert on internal messaging platform',
      defaultEnabled: true,
    },
    {
      key: 'weekly_digest',
      label: 'Weekly digest',
      description: 'Summary report of operations and metrics',
      defaultEnabled: true,
    },
    {
      key: 'system_updates',
      label: 'System updates',
      description: 'Technical maintenance and releases alert',
      defaultEnabled: false,
    },
  ],
  [NotificationChannel.Sms]: [
    {
      key: 'visit_reminders',
      label: 'Visit reminders',
      description: 'Sent 1 hour before scheduled start',
      defaultEnabled: true,
    },
    {
      key: 'emergency_alerts',
      label: 'Emergency alerts',
      description: 'Critical dispatch signals for coordinators',
      defaultEnabled: true,
    },
    {
      key: 'payment_confirmations',
      label: 'Payment confirmations',
      description: 'Settlement validation texts',
      defaultEnabled: true,
    },
    {
      key: 'shift_changes',
      label: 'Shift changes',
      description: 'Roster modification details',
      defaultEnabled: true,
    },
  ],
  [NotificationChannel.Push]: [
    {
      key: 'realtime_visit_updates',
      label: 'Real-time visit updates',
      description: 'Instant caregiver clock in/out reports',
      defaultEnabled: true,
    },
    {
      key: 'chat_messages',
      label: 'Chat messages',
      description: 'In-app discussion alerts',
      defaultEnabled: true,
    },
    {
      key: 'task_reminders',
      label: 'Task reminders',
      description: 'Care task execution checklists',
      defaultEnabled: true,
    },
    {
      key: 'approval_requests',
      label: 'Approval requests',
      description: 'Coordinator validation tasks',
      defaultEnabled: true,
    },
  ],
};

/** Whether (channel, key) is a known notification type. */
export function isKnownType(channel: NotificationChannel, key: string): boolean {
  return NOTIFICATION_CATALOG[channel].some((type) => type.key === key);
}

export interface TriggerDefinition {
  key: string;
  label: string;
}

/** The emergency alert triggers the system can raise. */
export const EMERGENCY_TRIGGER_CATALOG: TriggerDefinition[] = [
  { key: 'sos_button', label: 'SOS Button' },
  { key: 'missed_checkin_30m', label: 'Missed Check-in (30m)' },
  { key: 'incident_report', label: 'Incident Report' },
];

export const ALL_TRIGGER_KEYS: ReadonlySet<string> = new Set(
  EMERGENCY_TRIGGER_CATALOG.map((trigger) => trigger.key),
);
