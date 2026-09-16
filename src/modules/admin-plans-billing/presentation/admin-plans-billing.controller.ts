import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { GetPlansBillingOverviewUseCase } from '../application/use-cases/get-plans-billing-overview.use-case';
import { PlansBillingOverviewResponseDto } from './dto/plans-billing-overview-response.dto';
import { PlansBillingQueryDto } from './dto/plans-billing-query.dto';

/**
 * Admin Plans and Billing control panel. Every read is scoped to a single currency
 * (the market selector) so totals are honest. Requires a valid admin token.
 * Controllers stay thin.
 */
@ApiTags('admin-plans-billing')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/plans-billing', version: '1' })
export class AdminPlansBillingController {
  constructor(private readonly getOverview: GetPlansBillingOverviewUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Plans and Billing overview: KPIs, revenue, distribution, insights' })
  @ApiOkResponse({ type: PlansBillingOverviewResponseDto })
  async overview(@Query() query: PlansBillingQueryDto): Promise<PlansBillingOverviewResponseDto> {
    const result = await this.getOverview.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return PlansBillingOverviewResponseDto.fromResult(result);
  }
}
