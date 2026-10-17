import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import {
  GetCalendarFeedUseCase,
  RegenerateCalendarFeedUseCase,
} from '../application/use-cases/calendar-feed.use-cases';
import {
  GetCareCircleUseCase,
  GetCareCodeUseCase,
  RedeemCareCodeUseCase,
  RegenerateCareCodeUseCase,
  RemoveCareCircleMemberUseCase,
  SetCareCircleMemberAccessUseCase,
} from '../application/use-cases/care-circle.use-cases';
import {
  GetEmergencyContactUseCase,
  SetEmergencyContactUseCase,
} from '../application/use-cases/emergency-contact.use-cases';
import { GetPreferencesUseCase } from '../application/use-cases/get-preferences.use-case';
import { GetProfileAccountUseCase } from '../application/use-cases/get-profile-account.use-case';
import { UpdatePreferencesUseCase } from '../application/use-cases/update-preferences.use-case';
import { UpdatePhoneToolsUseCase } from '../application/use-cases/update-phone-tools.use-case';
import { ProfileAccountResponseDto } from './dto/profile-account-response.dto';
import {
  PreferencesResponseDto,
  UpdatePhoneToolsRequestDto,
  UpdatePreferencesRequestDto,
} from './dto/preferences.dto';
import {
  CareCircleResponseDto,
  CareCodeResponseDto,
  RedeemCareCodeRequestDto,
  RedeemCareCodeResponseDto,
  SetMemberAccessRequestDto,
} from './dto/care-circle.dto';
import {
  EmergencyContactResponseDto,
  SetEmergencyContactRequestDto,
} from './dto/emergency-contact.dto';
import { CalendarFeedResponseDto } from './dto/calendar-feed-response.dto';

/**
 * Family owner Profile tab. Every route requires a valid access token and is
 * scoped to the authenticated user.
 */
@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(
    private readonly getAccount: GetProfileAccountUseCase,
    private readonly getPreferences: GetPreferencesUseCase,
    private readonly updatePreferences: UpdatePreferencesUseCase,
    private readonly updatePhoneTools: UpdatePhoneToolsUseCase,
    private readonly getEmergencyContact: GetEmergencyContactUseCase,
    private readonly setEmergencyContact: SetEmergencyContactUseCase,
    private readonly getCareCircle: GetCareCircleUseCase,
    private readonly getCareCode: GetCareCodeUseCase,
    private readonly regenerateCareCode: RegenerateCareCodeUseCase,
    private readonly redeemCareCode: RedeemCareCodeUseCase,
    private readonly setMemberAccess: SetCareCircleMemberAccessUseCase,
    private readonly removeCareCircleMember: RemoveCareCircleMemberUseCase,
    private readonly getCalendarFeed: GetCalendarFeedUseCase,
    private readonly regenerateCalendarFeed: RegenerateCalendarFeedUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The profile account card: name, role, plan badge and avatar' })
  @ApiOkResponse({ type: ProfileAccountResponseDto })
  async account(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<ProfileAccountResponseDto> {
    const result = await this.getAccount.execute({ userId: principal.userId });
    return ProfileAccountResponseDto.fromResult(result);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'The owner notification and app preferences' })
  @ApiOkResponse({ type: PreferencesResponseDto })
  async preferences(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<PreferencesResponseDto> {
    const result = await this.getPreferences.execute({ userId: principal.userId });
    return PreferencesResponseDto.fromResult(result);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update the owner notification and app preferences' })
  @ApiOkResponse({ type: PreferencesResponseDto })
  async savePreferences(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: UpdatePreferencesRequestDto,
  ): Promise<PreferencesResponseDto> {
    const result = await this.updatePreferences.execute({
      userId: principal.userId,
      notifications: body.notifications,
      language: body.language,
      preferredContactMethod: body.preferredContactMethod,
      theme: body.theme,
      dateFormat: body.dateFormat,
      timeFormat: body.timeFormat,
      soundEnabled: body.soundEnabled,
      textSize: body.textSize,
    });
    return PreferencesResponseDto.fromResult(result);
  }

  @Patch('preferences/phone-tools')
  @ApiOperation({
    summary: 'Set the onboarding phone tools toggles (location services and push notifications)',
  })
  @ApiOkResponse({ type: PreferencesResponseDto })
  async savePhoneTools(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: UpdatePhoneToolsRequestDto,
  ): Promise<PreferencesResponseDto> {
    const result = await this.updatePhoneTools.execute({
      userId: principal.userId,
      locationServicesEnabled: body.locationServicesEnabled,
      pushNotificationsEnabled: body.pushNotificationsEnabled,
    });
    return PreferencesResponseDto.fromResult(result);
  }

  @Get('emergency-contact')
  @ApiOperation({ summary: 'The owner emergency contact, or null when none is set' })
  @ApiOkResponse({ type: EmergencyContactResponseDto })
  async emergencyContact(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<EmergencyContactResponseDto | null> {
    const result = await this.getEmergencyContact.execute({ userId: principal.userId });
    return result === null ? null : EmergencyContactResponseDto.fromResult(result);
  }

  @Put('emergency-contact')
  @ApiOperation({ summary: 'Set the owner emergency contact' })
  @ApiOkResponse({ type: EmergencyContactResponseDto })
  async saveEmergencyContact(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: SetEmergencyContactRequestDto,
  ): Promise<EmergencyContactResponseDto> {
    const result = await this.setEmergencyContact.execute({
      userId: principal.userId,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship,
    });
    return EmergencyContactResponseDto.fromResult(result);
  }

  @Get('care-circle')
  @ApiOperation({ summary: "The owner's care circle: the owner plus members" })
  @ApiOkResponse({ type: CareCircleResponseDto })
  async careCircle(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CareCircleResponseDto> {
    const view = await this.getCareCircle.execute({ ownerId: principal.userId });
    return CareCircleResponseDto.fromView(view);
  }

  @Get('care-circle/code')
  @ApiOperation({ summary: 'The owner shareable care code, minted on demand' })
  @ApiOkResponse({ type: CareCodeResponseDto })
  async careCode(@CurrentUser() principal: AuthenticatedPrincipal): Promise<CareCodeResponseDto> {
    const view = await this.getCareCode.execute({ ownerId: principal.userId });
    return CareCodeResponseDto.fromView(view);
  }

  @Post('care-circle/code/regenerate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Retire the current care code and issue a fresh one' })
  @ApiCreatedResponse({ type: CareCodeResponseDto })
  async regenerateCode(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CareCodeResponseDto> {
    const view = await this.regenerateCareCode.execute({ ownerId: principal.userId });
    return CareCodeResponseDto.fromView(view);
  }

  @Post('care-circle/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem a care code to join the sharing owner circle' })
  @ApiOkResponse({ type: RedeemCareCodeResponseDto })
  async redeemCode(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: RedeemCareCodeRequestDto,
  ): Promise<RedeemCareCodeResponseDto> {
    const result = await this.redeemCareCode.execute({
      userId: principal.userId,
      code: body.code,
    });
    return RedeemCareCodeResponseDto.fromResult(result);
  }

  @Patch('care-circle/members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a member permissions and relationship (step three)' })
  @ApiNoContentResponse()
  async setMemberPermissions(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetMemberAccessRequestDto,
  ): Promise<void> {
    await this.setMemberAccess.execute({
      ownerId: principal.userId,
      memberId: id,
      accessLevel: body.accessLevel,
      relationship: body.relationship,
    });
  }

  @Delete('care-circle/members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the care circle' })
  @ApiNoContentResponse()
  async deleteCareCircleMember(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.removeCareCircleMember.execute({ ownerId: principal.userId, memberId: id });
  }

  @Get('calendar-feed')
  @ApiOperation({ summary: 'The private calendar feed URL (subscribe from a calendar app)' })
  @ApiOkResponse({ type: CalendarFeedResponseDto })
  async calendarFeed(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CalendarFeedResponseDto> {
    const view = await this.getCalendarFeed.execute({ userId: principal.userId });
    return CalendarFeedResponseDto.fromView(view);
  }

  @Post('calendar-feed/regenerate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Rotate the calendar feed token, invalidating the old URL' })
  @ApiCreatedResponse({ type: CalendarFeedResponseDto })
  async regenerateCalendar(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CalendarFeedResponseDto> {
    const view = await this.regenerateCalendarFeed.execute({ userId: principal.userId });
    return CalendarFeedResponseDto.fromView(view);
  }
}
