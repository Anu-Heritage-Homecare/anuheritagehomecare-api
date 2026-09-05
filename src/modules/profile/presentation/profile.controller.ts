import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetPreferencesUseCase } from '../application/use-cases/get-preferences.use-case';
import { GetProfileAccountUseCase } from '../application/use-cases/get-profile-account.use-case';
import { UpdatePreferencesUseCase } from '../application/use-cases/update-preferences.use-case';
import { ProfileAccountResponseDto } from './dto/profile-account-response.dto';
import { PreferencesResponseDto, UpdatePreferencesRequestDto } from './dto/preferences.dto';

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
    });
    return PreferencesResponseDto.fromResult(result);
  }
}
