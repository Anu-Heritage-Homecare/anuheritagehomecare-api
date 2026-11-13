import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  NOTIFICATION_SETTINGS_REPOSITORY,
  NotificationSettingsRepository,
} from '../../domain/notification-settings.repository';
import { NotificationsResult, loadNotificationsResult } from '../dto/notifications.result';

/** Use case: read the whole Notifications settings screen. */
@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repository: NotificationSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(): Promise<NotificationsResult> {
    return loadNotificationsResult(this.repository, this.clock.now());
  }
}
