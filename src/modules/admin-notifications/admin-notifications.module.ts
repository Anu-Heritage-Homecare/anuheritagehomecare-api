import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NOTIFICATION_SETTINGS_REPOSITORY } from './domain/notification-settings.repository';
import { GetNotificationsUseCase } from './application/use-cases/get-notifications.use-case';
import { SetNotificationToggleUseCase } from './application/use-cases/set-notification-toggle.use-case';
import {
  UpdateEmergencyAlertsUseCase,
  UpdateSmsProviderUseCase,
  UpdateVisitReminderRulesUseCase,
} from './application/use-cases/update-notification-settings.use-cases';
import { NotificationSettingsPrismaRepository } from './infrastructure/persistence/notification-settings.prisma.repository';
import { NotificationsController } from './presentation/notifications.controller';

/**
 * Admin Notifications bounded context composition root. Powers Settings >
 * Notifications: the per channel toggles, the visit reminder timing rules, the
 * emergency alert routing and the SMS provider integration status.
 */
@Module({
  imports: [PassportModule],
  controllers: [NotificationsController],
  providers: [
    GetNotificationsUseCase,
    SetNotificationToggleUseCase,
    UpdateVisitReminderRulesUseCase,
    UpdateEmergencyAlertsUseCase,
    UpdateSmsProviderUseCase,
    { provide: NOTIFICATION_SETTINGS_REPOSITORY, useClass: NotificationSettingsPrismaRepository },
  ],
})
export class AdminNotificationsModule {}
