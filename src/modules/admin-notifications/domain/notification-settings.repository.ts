import { NotificationChannel } from './notification-channel.enum';
import { NotificationSettings } from './notification-settings.entity';

/** The fixed id of the one and only notification settings row. */
export const NOTIFICATION_SETTINGS_ID = 'notification_settings';

/** A saved on/off override for one notification type on one channel. */
export interface NotificationToggleState {
  channel: NotificationChannel;
  key: string;
  enabled: boolean;
}

/**
 * Persistence port for the notification settings singleton and the per type
 * toggle overrides. A toggle not present falls back to the catalog default.
 */
export interface NotificationSettingsRepository {
  getSettings(): Promise<NotificationSettings | null>;
  saveSettings(settings: NotificationSettings): Promise<void>;
  listToggles(): Promise<NotificationToggleState[]>;
  saveToggle(toggle: NotificationToggleState): Promise<void>;
}

export const NOTIFICATION_SETTINGS_REPOSITORY = Symbol('NOTIFICATION_SETTINGS_REPOSITORY');
