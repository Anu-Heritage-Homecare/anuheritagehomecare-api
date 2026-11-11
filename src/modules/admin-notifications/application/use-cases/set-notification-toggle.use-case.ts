import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { isKnownType } from '../../domain/notification-catalog';
import {
  NOTIFICATION_SETTINGS_REPOSITORY,
  NotificationSettingsRepository,
} from '../../domain/notification-settings.repository';
import { NotificationsResult, loadNotificationsResult } from '../dto/notifications.result';

export interface SetNotificationToggleCommand {
  channel: NotificationChannel;
  key: string;
  enabled: boolean;
}

/** Use case: switch one notification type on or off for a channel. */
@Injectable()
export class SetNotificationToggleUseCase {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repository: NotificationSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetNotificationToggleCommand): Promise<NotificationsResult> {
    if (!isKnownType(command.channel, command.key)) {
      throw new ValidationException(`Unknown notification type: ${command.channel}/${command.key}`);
    }
    await this.repository.saveToggle({
      channel: command.channel,
      key: command.key,
      enabled: command.enabled,
    });
    return loadNotificationsResult(this.repository, this.clock.now());
  }
}
