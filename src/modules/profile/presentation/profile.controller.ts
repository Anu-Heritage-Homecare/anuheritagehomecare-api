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
  AddCareCircleMemberUseCase,
  ListCareCircleUseCase,
  RemoveCareCircleMemberUseCase,
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
import { AddCareCircleMemberRequestDto, CareCircleMemberResponseDto } from './dto/care-circle.dto';
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
    private readonly listCareCircle: ListCareCircleUseCase,
    private readonly addCareCircleMember: AddCareCircleMemberUseCase,
    private readonly removeCareCircleMember: RemoveCareCircleMemberUseCase,
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
  @ApiOperation({ summary: "The owner's care circle" })
  @ApiOkResponse({ type: [CareCircleMemberResponseDto] })
  async careCircle(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CareCircleMemberResponseDto[]> {
    const results = await this.listCareCircle.execute({ ownerId: principal.userId });
    return results.map((result) => CareCircleMemberResponseDto.fromResult(result));
  }

  @Post('care-circle')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a person to the care circle' })
  @ApiCreatedResponse({ type: CareCircleMemberResponseDto })
  async addCareCircle(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: AddCareCircleMemberRequestDto,
  ): Promise<CareCircleMemberResponseDto> {
    const result = await this.addCareCircleMember.execute({
      ownerId: principal.userId,
      name: body.name,
      relationship: body.relationship,
      phone: body.phone,
      email: body.email,
    });
    return CareCircleMemberResponseDto.fromResult(result);
  }

  @Delete('care-circle/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a person from the care circle' })
  @ApiNoContentResponse()
  async removeCareCircle(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.removeCareCircleMember.execute({ ownerId: principal.userId, memberId: id });
  }
}
