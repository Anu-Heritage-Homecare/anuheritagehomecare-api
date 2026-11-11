import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { NotificationChannel } from '../domain/notification-channel.enum';
import { GetNotificationsUseCase } from '../application/use-cases/get-notifications.use-case';
import { SetNotificationToggleUseCase } from '../application/use-cases/set-notification-toggle.use-case';
import {
  UpdateEmergencyAlertsUseCase,
  UpdateSmsProviderUseCase,
  UpdateVisitReminderRulesUseCase,
} from '../application/use-cases/update-notification-settings.use-cases';
import {
  SetToggleRequestDto,
  UpdateEmergencyAlertsRequestDto,
  UpdateSmsProviderRequestDto,
  UpdateVisitRemindersRequestDto,
} from './dto/notifications-request.dto';
import { NotificationsResponseDto } from './dto/notifications-response.dto';

/**
 * Settings > Notifications. One aggregated read of the whole screen plus the per
 * channel toggles, the visit reminder timing rules, the emergency alert routing
 * and the SMS provider integration. Every route requires a valid admin token.
 * These settings are the office's configured intent; a notification dispatcher
 * that enforces them is a later step.
 */
@ApiTags('admin-notifications')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly getScreen: GetNotificationsUseCase,
    private readonly setToggle: SetNotificationToggleUseCase,
    private readonly updateVisitReminders: UpdateVisitReminderRulesUseCase,
    private readonly updateEmergencyAlerts: UpdateEmergencyAlertsUseCase,
    private readonly updateSmsProvider: UpdateSmsProviderUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The whole Notifications settings screen in one read' })
  @ApiOkResponse({ type: NotificationsResponseDto })
  async read(): Promise<NotificationsResponseDto> {
    return NotificationsResponseDto.fromResult(await this.getScreen.execute());
  }

  @Put('toggles/:channel/:key')
  @ApiOperation({ summary: 'Switch one notification type on or off for a channel' })
  @ApiOkResponse({ type: NotificationsResponseDto })
  async toggle(
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
    @Param('key') key: string,
    @Body() body: SetToggleRequestDto,
  ): Promise<NotificationsResponseDto> {
    return NotificationsResponseDto.fromResult(
      await this.setToggle.execute({ channel, key, enabled: body.enabled }),
    );
  }

  @Put('visit-reminders')
  @ApiOperation({ summary: 'Set the visit reminder timing rules (the Edit Rules action)' })
  @ApiOkResponse({ type: NotificationsResponseDto })
  async visitReminders(
    @Body() body: UpdateVisitRemindersRequestDto,
  ): Promise<NotificationsResponseDto> {
    return NotificationsResponseDto.fromResult(await this.updateVisitReminders.execute(body));
  }

  @Put('emergency-alerts')
  @ApiOperation({ summary: 'Set the emergency alert routing (the Edit action)' })
  @ApiOkResponse({ type: NotificationsResponseDto })
  async emergencyAlerts(
    @Body() body: UpdateEmergencyAlertsRequestDto,
  ): Promise<NotificationsResponseDto> {
    return NotificationsResponseDto.fromResult(await this.updateEmergencyAlerts.execute(body));
  }

  @Patch('sms-provider')
  @ApiOperation({ summary: 'Set the SMS provider integration name and status' })
  @ApiOkResponse({ type: NotificationsResponseDto })
  async smsProvider(@Body() body: UpdateSmsProviderRequestDto): Promise<NotificationsResponseDto> {
    return NotificationsResponseDto.fromResult(await this.updateSmsProvider.execute(body));
  }
}
