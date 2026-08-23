import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { GetCurrentEarningsUseCase } from '../application/use-cases/get-current-earnings.use-case';
import { EarningsResponseDto } from './dto/earnings-response.dto';

/**
 * Caregiver earnings (the wallet dashboard). Every route requires a valid access
 * token and is scoped to the authenticated caregiver, so they only ever see their
 * own earnings. The billing currency is derived server side from the caregiver's
 * country carried in the token.
 */
@ApiTags('caregiver-earnings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/earnings', version: '1' })
export class CaregiverEarningsController {
  constructor(private readonly getCurrentEarnings: GetCurrentEarningsUseCase) {}

  @Get('current')
  @ApiOperation({ summary: "The caregiver's earnings for the current pay period" })
  @ApiOkResponse({ type: EarningsResponseDto })
  async current(@CurrentUser() principal: AuthenticatedPrincipal): Promise<EarningsResponseDto> {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can view earnings');
    }
    const result = await this.getCurrentEarnings.execute({
      caregiverId: principal.userId,
      country: principal.country,
    });
    return EarningsResponseDto.fromResult(result);
  }
}
