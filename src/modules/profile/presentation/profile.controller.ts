import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetProfileAccountUseCase } from '../application/use-cases/get-profile-account.use-case';
import { ProfileAccountResponseDto } from './dto/profile-account-response.dto';

/**
 * Family owner Profile tab. Every route requires a valid access token and is
 * scoped to the authenticated user.
 */
@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(private readonly getAccount: GetProfileAccountUseCase) {}

  @Get()
  @ApiOperation({ summary: 'The profile account card: name, role, plan badge and avatar' })
  @ApiOkResponse({ type: ProfileAccountResponseDto })
  async account(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<ProfileAccountResponseDto> {
    const result = await this.getAccount.execute({ userId: principal.userId });
    return ProfileAccountResponseDto.fromResult(result);
  }
}
