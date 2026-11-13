import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { NotificationsResult } from '../../application/dto/notifications.result';

class NotificationToggleResponseDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() description!: string;
  @ApiProperty() enabled!: boolean;
}

class NotificationChannelResponseDto {
  @ApiProperty({ enum: NotificationChannel }) channel!: NotificationChannel;
  @ApiProperty({ type: [NotificationToggleResponseDto] }) types!: NotificationToggleResponseDto[];
}

class VisitReminderRulesResponseDto {
  @ApiProperty() caregiverReminderMinutes!: number;
  @ApiProperty() familyNotificationMinutes!: number;
  @ApiProperty() coordinatorLateMinutes!: number;
}

class TriggerResponseDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
}

class EmergencyAlertsResponseDto {
  @ApiProperty({ type: [String] }) recipients!: string[];
  @ApiProperty({ enum: NotificationChannel, isArray: true }) channels!: NotificationChannel[];
  @ApiProperty({ type: [String] }) triggers!: string[];
  @ApiProperty({ type: [TriggerResponseDto] }) availableTriggers!: TriggerResponseDto[];
}

class SmsProviderResponseDto {
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
  @ApiProperty() connected!: boolean;
}

/** The whole Notifications settings screen. */
export class NotificationsResponseDto {
  @ApiProperty({ type: [NotificationChannelResponseDto] })
  channels!: NotificationChannelResponseDto[];
  @ApiProperty({ type: VisitReminderRulesResponseDto })
  visitReminders!: VisitReminderRulesResponseDto;
  @ApiProperty({ type: EmergencyAlertsResponseDto }) emergencyAlerts!: EmergencyAlertsResponseDto;
  @ApiProperty({ type: SmsProviderResponseDto }) smsProvider!: SmsProviderResponseDto;

  static fromResult(result: NotificationsResult): NotificationsResponseDto {
    return Object.assign(new NotificationsResponseDto(), result);
  }
}
