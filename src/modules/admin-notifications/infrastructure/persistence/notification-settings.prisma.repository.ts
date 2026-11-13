import { Injectable } from '@nestjs/common';
import {
  NotificationChannel as PrismaChannel,
  NotificationSettings as PrismaSettings,
  NotificationToggle as PrismaToggle,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { NotificationSettings } from '../../domain/notification-settings.entity';
import {
  NOTIFICATION_SETTINGS_ID,
  NotificationSettingsRepository,
  NotificationToggleState,
} from '../../domain/notification-settings.repository';

const TO_DOMAIN_CHANNEL: Record<PrismaChannel, NotificationChannel> = {
  EMAIL: NotificationChannel.Email,
  SMS: NotificationChannel.Sms,
  PUSH: NotificationChannel.Push,
};
const TO_PRISMA_CHANNEL: Record<NotificationChannel, PrismaChannel> = {
  [NotificationChannel.Email]: 'EMAIL',
  [NotificationChannel.Sms]: 'SMS',
  [NotificationChannel.Push]: 'PUSH',
};

/** Prisma backed adapter for the NotificationSettingsRepository port. */
@Injectable()
export class NotificationSettingsPrismaRepository implements NotificationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<NotificationSettings | null> {
    const row = await this.prisma.notificationSettings.findUnique({
      where: { id: NOTIFICATION_SETTINGS_ID },
    });
    return row ? NotificationSettingsPrismaRepository.toDomain(row) : null;
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    const data = {
      caregiverReminderMinutes: settings.caregiverReminderMinutes,
      familyNotificationMinutes: settings.familyNotificationMinutes,
      coordinatorLateMinutes: settings.coordinatorLateMinutes,
      emergencyRecipients: [...settings.emergencyRecipients],
      emergencyChannels: settings.emergencyChannels.map((channel) => TO_PRISMA_CHANNEL[channel]),
      emergencyTriggers: [...settings.emergencyTriggers],
      smsProviderName: settings.smsProviderName,
      smsProviderConnected: settings.smsProviderConnected,
      updatedAt: settings.updatedAt,
    };
    await this.prisma.notificationSettings.upsert({
      where: { id: NOTIFICATION_SETTINGS_ID },
      create: { id: NOTIFICATION_SETTINGS_ID, createdAt: settings.createdAt, ...data },
      update: data,
    });
  }

  async listToggles(): Promise<NotificationToggleState[]> {
    const rows = await this.prisma.notificationToggle.findMany();
    return rows.map((row) => NotificationSettingsPrismaRepository.toToggle(row));
  }

  async saveToggle(toggle: NotificationToggleState): Promise<void> {
    const channel = TO_PRISMA_CHANNEL[toggle.channel];
    await this.prisma.notificationToggle.upsert({
      where: { channel_key: { channel, key: toggle.key } },
      create: { channel, key: toggle.key, enabled: toggle.enabled },
      update: { enabled: toggle.enabled },
    });
  }

  private static toDomain(row: PrismaSettings): NotificationSettings {
    return NotificationSettings.rehydrate(row.id, {
      caregiverReminderMinutes: row.caregiverReminderMinutes,
      familyNotificationMinutes: row.familyNotificationMinutes,
      coordinatorLateMinutes: row.coordinatorLateMinutes,
      emergencyRecipients: row.emergencyRecipients,
      emergencyChannels: row.emergencyChannels.map((channel) => TO_DOMAIN_CHANNEL[channel]),
      emergencyTriggers: row.emergencyTriggers,
      smsProviderName: row.smsProviderName,
      smsProviderConnected: row.smsProviderConnected,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private static toToggle(row: PrismaToggle): NotificationToggleState {
    return {
      channel: TO_DOMAIN_CHANNEL[row.channel],
      key: row.key,
      enabled: row.enabled,
    };
  }
}
