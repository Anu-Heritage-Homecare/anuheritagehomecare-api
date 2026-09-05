import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  AcceptCareCircleInvitationUseCase,
  GetCareCircleUseCase,
  InviteCareCircleMemberUseCase,
  RemoveCareCircleMemberUseCase,
  RevokeCareCircleInvitationUseCase,
} from '../application/use-cases/care-circle.use-cases';
import {
  GetEmergencyContactUseCase,
  SetEmergencyContactUseCase,
} from '../application/use-cases/emergency-contact.use-cases';
import { GetPreferencesUseCase } from '../application/use-cases/get-preferences.use-case';
import { GetProfileAccountUseCase } from '../application/use-cases/get-profile-account.use-case';
import { UpdatePreferencesUseCase } from '../application/use-cases/update-preferences.use-case';
import { ProfileAccountResponseDto } from './dto/profile-account-response.dto';
import { PreferencesResponseDto, UpdatePreferencesRequestDto } from './dto/preferences.dto';
import {
  AcceptInvitationRequestDto,
  CareCircleInvitationResponseDto,
  CareCircleResponseDto,
  InviteCareCircleMemberRequestDto,
} from './dto/care-circle.dto';
import {
  EmergencyContactResponseDto,
  SetEmergencyContactRequestDto,
} from './dto/emergency-contact.dto';

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
    private readonly getEmergencyContact: GetEmergencyContactUseCase,
    private readonly setEmergencyContact: SetEmergencyContactUseCase,
    private readonly getCareCircle: GetCareCircleUseCase,
    private readonly inviteCareCircleMember: InviteCareCircleMemberUseCase,
    private readonly acceptInvitation: AcceptCareCircleInvitationUseCase,
    private readonly removeCareCircleMember: RemoveCareCircleMemberUseCase,
    private readonly revokeInvitation: RevokeCareCircleInvitationUseCase,
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
  @ApiOperation({ summary: "The owner's care circle: members and pending invitations" })
  @ApiOkResponse({ type: CareCircleResponseDto })
  async careCircle(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CareCircleResponseDto> {
    const view = await this.getCareCircle.execute({ ownerId: principal.userId });
    return CareCircleResponseDto.fromView(view);
  }

  @Post('care-circle/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a person to the care circle by email' })
  @ApiCreatedResponse({ type: CareCircleInvitationResponseDto })
  async inviteMember(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: InviteCareCircleMemberRequestDto,
  ): Promise<CareCircleInvitationResponseDto> {
    const view = await this.inviteCareCircleMember.execute({
      ownerId: principal.userId,
      email: body.email,
      relationship: body.relationship,
      accessLevel: body.accessLevel,
    });
    return CareCircleInvitationResponseDto.from(view);
  }

  @Post('care-circle/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept a care circle invitation (the invited user)' })
  @ApiNoContentResponse()
  async acceptCareCircleInvitation(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: AcceptInvitationRequestDto,
  ): Promise<void> {
    await this.acceptInvitation.execute({
      userId: principal.userId,
      email: principal.email,
      token: body.token,
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

  @Delete('care-circle/invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending care circle invitation' })
  @ApiNoContentResponse()
  async revokeCareCircleInvitation(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.revokeInvitation.execute({ ownerId: principal.userId, invitationId: id });
  }
}
