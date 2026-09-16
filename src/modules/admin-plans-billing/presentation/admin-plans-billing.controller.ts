import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { CancelSubscriptionUseCase } from '../application/use-cases/cancel-subscription.use-case';
import { ChangeSubscriptionPlanUseCase } from '../application/use-cases/change-subscription-plan.use-case';
import { GetPlansBillingOverviewUseCase } from '../application/use-cases/get-plans-billing-overview.use-case';
import { ListPlanSubscriptionsUseCase } from '../application/use-cases/list-plan-subscriptions.use-case';
import { ChangeSubscriptionPlanRequestDto } from './dto/change-subscription-plan.dto';
import { PlansBillingOverviewResponseDto } from './dto/plans-billing-overview-response.dto';
import { PlansBillingQueryDto } from './dto/plans-billing-query.dto';
import { SubscriptionListResponseDto } from './dto/subscription-list-response.dto';
import { SubscriptionsQueryDto } from './dto/subscriptions-query.dto';

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
  constructor(
    private readonly getOverview: GetPlansBillingOverviewUseCase,
    private readonly listSubscriptions: ListPlanSubscriptionsUseCase,
    private readonly changePlan: ChangeSubscriptionPlanUseCase,
    private readonly cancelSubscription: CancelSubscriptionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Plans and Billing overview: KPIs, revenue, distribution, insights' })
  @ApiOkResponse({ type: PlansBillingOverviewResponseDto })
  async overview(@Query() query: PlansBillingQueryDto): Promise<PlansBillingOverviewResponseDto> {
    const result = await this.getOverview.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return PlansBillingOverviewResponseDto.fromResult(result);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions for one market, with derived renewal dates' })
  @ApiOkResponse({ type: SubscriptionListResponseDto })
  async subscriptions(@Query() query: SubscriptionsQueryDto): Promise<SubscriptionListResponseDto> {
    const result = await this.listSubscriptions.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return SubscriptionListResponseDto.fromResult(result);
  }

  @Post('subscriptions/:id/plan')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change a subscription to a different monthly plan tier' })
  @ApiNoContentResponse()
  async upgrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeSubscriptionPlanRequestDto,
  ): Promise<void> {
    await this.changePlan.execute({ subscriptionId: id, planType: body.planType });
  }

  @Post('subscriptions/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiNoContentResponse()
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.cancelSubscription.execute({ subscriptionId: id });
  }
}
