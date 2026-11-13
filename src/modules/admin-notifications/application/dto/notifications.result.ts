import { NotificationChannel } from '../../domain/notification-channel.enum';
import { EMERGENCY_TRIGGER_CATALOG, NOTIFICATION_CATALOG } from '../../domain/notification-catalog';
import { NotificationSettings } from '../../domain/notification-settings.entity';
import {
  NOTIFICATION_SETTINGS_ID,
  NotificationSettingsRepository,
} from '../../domain/notification-settings.repository';

export interface NotificationToggleResult {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface NotificationChannelResult {
  channel: NotificationChannel;
  types: NotificationToggleResult[];
}

export interface VisitReminderRulesResult {
  caregiverReminderMinutes: number;
  familyNotificationMinutes: number;
  coordinatorLateMinutes: number;
}

export interface EmergencyAlertsResult {
  recipients: string[];
  channels: NotificationChannel[];
  triggers: string[];
  availableTriggers: { key: string; label: string }[];
}

export interface SmsProviderResult {
  name: string | null;
  connected: boolean;
}

/** The whole Notifications settings screen. */
export interface NotificationsResult {
  channels: NotificationChannelResult[];
  visitReminders: VisitReminderRulesResult;
  emergencyAlerts: EmergencyAlertsResult;
  smsProvider: SmsProviderResult;
}

const CHANNEL_ORDER: NotificationChannel[] = [
  NotificationChannel.Email,
  NotificationChannel.Sms,
  NotificationChannel.Push,
];

function toChannelResults(overrides: Map<string, boolean>): NotificationChannelResult[] {
  return CHANNEL_ORDER.map((channel) => ({
    channel,
    types: NOTIFICATION_CATALOG[channel].map((type) => ({
      key: type.key,
      label: type.label,
      description: type.description,
      enabled: overrides.get(`${channel}:${type.key}`) ?? type.defaultEnabled,
    })),
  }));
}

function toResult(
  settings: NotificationSettings,
  overrides: Map<string, boolean>,
): NotificationsResult {
  return {
    channels: toChannelResults(overrides),
    visitReminders: {
      caregiverReminderMinutes: settings.caregiverReminderMinutes,
      familyNotificationMinutes: settings.familyNotificationMinutes,
      coordinatorLateMinutes: settings.coordinatorLateMinutes,
    },
    emergencyAlerts: {
      recipients: [...settings.emergencyRecipients],
      channels: [...settings.emergencyChannels],
      triggers: [...settings.emergencyTriggers],
      availableTriggers: EMERGENCY_TRIGGER_CATALOG.map((trigger) => ({ ...trigger })),
    },
    smsProvider: {
      name: settings.smsProviderName,
      connected: settings.smsProviderConnected,
    },
  };
}

/** Assemble the whole screen, merging saved toggle overrides onto the catalog defaults. */
export async function loadNotificationsResult(
  repository: NotificationSettingsRepository,
  now: Date,
): Promise<NotificationsResult> {
  const [settings, toggles] = await Promise.all([
    repository.getSettings(),
    repository.listToggles(),
  ]);
  const overrides = new Map<string, boolean>(
    toggles.map((toggle) => [`${toggle.channel}:${toggle.key}`, toggle.enabled]),
  );
  return toResult(
    settings ?? NotificationSettings.defaults(NOTIFICATION_SETTINGS_ID, now),
    overrides,
  );
}
