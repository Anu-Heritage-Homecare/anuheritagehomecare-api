import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { NotificationSettings } from '../../domain/notification-settings.entity';
import {
  NOTIFICATION_SETTINGS_ID,
  NOTIFICATION_SETTINGS_REPOSITORY,
  NotificationSettingsRepository,
} from '../../domain/notification-settings.repository';
import { NotificationsResult, loadNotificationsResult } from '../dto/notifications.result';

/** Load (or default) the settings, apply a change, save, and return the whole screen. */
async function applyChange(
  repository: NotificationSettingsRepository,
  clock: Clock,
  change: (settings: NotificationSettings, now: Date) => void,
): Promise<NotificationsResult> {
  const now = clock.now();
  const settings =
    (await repository.getSettings()) ??
    NotificationSettings.defaults(NOTIFICATION_SETTINGS_ID, now);
  change(settings, now);
  await repository.saveSettings(settings);
  return loadNotificationsResult(repository, now);
}

export interface UpdateVisitReminderRulesCommand {
  caregiverReminderMinutes?: number;
  familyNotificationMinutes?: number;
  coordinatorLateMinutes?: number;
}

/** Use case: set the visit reminder timing rules (the Edit Rules action). */
@Injectable()
export class UpdateVisitReminderRulesUseCase {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repository: NotificationSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: UpdateVisitReminderRulesCommand): Promise<NotificationsResult> {
    return applyChange(this.repository, this.clock, (settings, now) =>
      settings.setVisitReminders(command, now),
    );
  }
}

export interface UpdateEmergencyAlertsCommand {
  recipients?: string[];
  channels?: NotificationChannel[];
  triggers?: string[];
}

/** Use case: set the emergency alert routing (the Edit action). */
@Injectable()
export class UpdateEmergencyAlertsUseCase {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repository: NotificationSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: UpdateEmergencyAlertsCommand): Promise<NotificationsResult> {
    return applyChange(this.repository, this.clock, (settings, now) =>
      settings.setEmergencyAlerts(command, now),
    );
  }
}

export interface UpdateSmsProviderCommand {
  name?: string | null;
  connected?: boolean;
}

/** Use case: set the SMS provider integration name and connection status. */
@Injectable()
export class UpdateSmsProviderUseCase {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repository: NotificationSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: UpdateSmsProviderCommand): Promise<NotificationsResult> {
    return applyChange(this.repository, this.clock, (settings, now) =>
      settings.setSmsProvider(command, now),
    );
  }
}
