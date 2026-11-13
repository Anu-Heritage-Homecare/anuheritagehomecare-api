import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { NotificationChannel } from './notification-channel.enum';
import { ALL_TRIGGER_KEYS } from './notification-catalog';

const MAX_MINUTES = 7 * 24 * 60;
const MAX_RECIPIENT = 160;
const MAX_RECIPIENTS = 50;
const MAX_PROVIDER = 80;
const VALID_CHANNELS = new Set<string>(Object.values(NotificationChannel));

interface NotificationSettingsProps {
  caregiverReminderMinutes: number;
  familyNotificationMinutes: number;
  coordinatorLateMinutes: number;
  emergencyRecipients: string[];
  emergencyChannels: NotificationChannel[];
  emergencyTriggers: string[];
  smsProviderName: string | null;
  smsProviderConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The singleton global notification settings: the visit reminder timing rules, the
 * emergency alert routing (recipients, channels, triggers) and the SMS provider
 * integration status. The per channel on/off toggles are stored separately against
 * the notification catalog.
 */
export class NotificationSettings extends AggregateRoot<string> {
  private props: NotificationSettingsProps;

  private constructor(id: string, props: NotificationSettingsProps) {
    super(id);
    this.props = props;
  }

  public static defaults(id: string, now: Date): NotificationSettings {
    return new NotificationSettings(id, {
      caregiverReminderMinutes: 60,
      familyNotificationMinutes: 30,
      coordinatorLateMinutes: 15,
      emergencyRecipients: [],
      emergencyChannels: [
        NotificationChannel.Sms,
        NotificationChannel.Push,
        NotificationChannel.Email,
      ],
      emergencyTriggers: [],
      smsProviderName: null,
      smsProviderConnected: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(id: string, props: NotificationSettingsProps): NotificationSettings {
    return new NotificationSettings(id, props);
  }

  /** Set the visit reminder timing rules (the Edit Rules action). */
  public setVisitReminders(
    fields: {
      caregiverReminderMinutes?: number;
      familyNotificationMinutes?: number;
      coordinatorLateMinutes?: number;
    },
    now: Date,
  ): void {
    if (fields.caregiverReminderMinutes !== undefined) {
      this.props.caregiverReminderMinutes = NotificationSettings.cleanMinutes(
        fields.caregiverReminderMinutes,
        'Caregiver reminder',
      );
    }
    if (fields.familyNotificationMinutes !== undefined) {
      this.props.familyNotificationMinutes = NotificationSettings.cleanMinutes(
        fields.familyNotificationMinutes,
        'Family notification',
      );
    }
    if (fields.coordinatorLateMinutes !== undefined) {
      this.props.coordinatorLateMinutes = NotificationSettings.cleanMinutes(
        fields.coordinatorLateMinutes,
        'Coordinator alert',
      );
    }
    this.props.updatedAt = now;
  }

  /** Set the emergency alert routing (the Edit action). */
  public setEmergencyAlerts(
    fields: {
      recipients?: string[];
      channels?: NotificationChannel[];
      triggers?: string[];
    },
    now: Date,
  ): void {
    if (fields.recipients !== undefined) {
      this.props.emergencyRecipients = NotificationSettings.cleanRecipients(fields.recipients);
    }
    if (fields.channels !== undefined) {
      this.props.emergencyChannels = NotificationSettings.cleanChannels(fields.channels);
    }
    if (fields.triggers !== undefined) {
      this.props.emergencyTriggers = NotificationSettings.cleanTriggers(fields.triggers);
    }
    this.props.updatedAt = now;
  }

  /** Set the SMS provider integration (name and connection status). */
  public setSmsProvider(fields: { name?: string | null; connected?: boolean }, now: Date): void {
    if (fields.name !== undefined) {
      this.props.smsProviderName = NotificationSettings.cleanProvider(fields.name);
    }
    if (fields.connected !== undefined) {
      this.props.smsProviderConnected = fields.connected;
    }
    this.props.updatedAt = now;
  }

  private static cleanMinutes(value: number, label: string): number {
    if (!Number.isInteger(value) || value < 0 || value > MAX_MINUTES) {
      throw new ValidationException(`${label} must be a non negative number of minutes`);
    }
    return value;
  }

  private static cleanRecipients(recipients: string[]): string[] {
    const unique = new Set<string>();
    for (const recipient of recipients) {
      const trimmed = recipient.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_RECIPIENT) {
        throw new ValidationException('A recipient label must be 1 to 160 characters');
      }
      unique.add(trimmed);
    }
    if (unique.size > MAX_RECIPIENTS) {
      throw new ValidationException('Too many recipients');
    }
    return [...unique];
  }

  private static cleanChannels(channels: NotificationChannel[]): NotificationChannel[] {
    const unique = new Set<NotificationChannel>();
    for (const channel of channels) {
      if (!VALID_CHANNELS.has(channel)) {
        throw new ValidationException(`Unknown channel: ${channel}`);
      }
      unique.add(channel);
    }
    return [...unique];
  }

  private static cleanTriggers(triggers: string[]): string[] {
    const unique = new Set<string>();
    for (const trigger of triggers) {
      if (!ALL_TRIGGER_KEYS.has(trigger)) {
        throw new ValidationException(`Unknown trigger: ${trigger}`);
      }
      unique.add(trigger);
    }
    return [...unique];
  }

  private static cleanProvider(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > MAX_PROVIDER) {
      throw new ValidationException('Provider name exceeds the maximum length');
    }
    return trimmed;
  }

  public get caregiverReminderMinutes(): number {
    return this.props.caregiverReminderMinutes;
  }

  public get familyNotificationMinutes(): number {
    return this.props.familyNotificationMinutes;
  }

  public get coordinatorLateMinutes(): number {
    return this.props.coordinatorLateMinutes;
  }

  public get emergencyRecipients(): ReadonlyArray<string> {
    return this.props.emergencyRecipients;
  }

  public get emergencyChannels(): ReadonlyArray<NotificationChannel> {
    return this.props.emergencyChannels;
  }

  public get emergencyTriggers(): ReadonlyArray<string> {
    return this.props.emergencyTriggers;
  }

  public get smsProviderName(): string | null {
    return this.props.smsProviderName;
  }

  public get smsProviderConnected(): boolean {
    return this.props.smsProviderConnected;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
