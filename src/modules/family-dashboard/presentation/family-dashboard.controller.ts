import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetFamilyDashboardUseCase } from '../application/use-cases/get-family-dashboard.use-case';
import { FamilyDashboardResponseDto } from './dto/family-dashboard-response.dto';

/**
 * Family owner home dashboard. Requires a valid access token and is scoped to the
 * authenticated owner, so it only ever aggregates the recipients they own. The
 * controller stays thin, translating the request into a use case call and back.
 */
@ApiTags('family-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'family', version: '1' })
export class FamilyDashboardController {
  constructor(private readonly getDashboard: GetFamilyDashboardUseCase) {}

  @Get('dashboard')
  @ApiOperation({ summary: "The family owner's home dashboard for today" })
  @ApiOkResponse({ type: FamilyDashboardResponseDto })
  async dashboard(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<FamilyDashboardResponseDto> {
    const result = await this.getDashboard.execute({ ownerId: principal.userId });
    return FamilyDashboardResponseDto.fromResult(result);
  }
}
