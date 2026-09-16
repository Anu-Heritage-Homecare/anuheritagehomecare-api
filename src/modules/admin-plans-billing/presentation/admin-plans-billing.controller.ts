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
import { CareRequestStatus } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { ApproveCareRequestUseCase } from '../application/use-cases/approve-care-request.use-case';
import { CancelSubscriptionUseCase } from '../application/use-cases/cancel-subscription.use-case';
import { ChangeSubscriptionPlanUseCase } from '../application/use-cases/change-subscription-plan.use-case';
import { DeclineCareRequestUseCase } from '../application/use-cases/decline-care-request.use-case';
import { GetPlansBillingOverviewUseCase } from '../application/use-cases/get-plans-billing-overview.use-case';
import { GetRenewalsTimelineUseCase } from '../application/use-cases/get-renewals-timeline.use-case';
import { ListCareRequestsUseCase } from '../application/use-cases/list-care-requests.use-case';
import { ListPlanSubscriptionsUseCase } from '../application/use-cases/list-plan-subscriptions.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { CareRequestListResponseDto } from './dto/care-request-list-response.dto';
import { CareRequestsQueryDto } from './dto/care-requests-query.dto';
import { ChangeSubscriptionPlanRequestDto } from './dto/change-subscription-plan.dto';
import { DeclineCareRequestRequestDto } from './dto/decline-care-request.dto';
import { PlansBillingOverviewResponseDto } from './dto/plans-billing-overview-response.dto';
import { PlansBillingQueryDto } from './dto/plans-billing-query.dto';
import { RenewalsResponseDto } from './dto/renewals-response.dto';
import { SubscriptionListResponseDto } from './dto/subscription-list-response.dto';
import { SubscriptionsQueryDto } from './dto/subscriptions-query.dto';
import { TransactionListResponseDto } from './dto/transaction-list-response.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';

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
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly getRenewals: GetRenewalsTimelineUseCase,
    private readonly listCareRequests: ListCareRequestsUseCase,
    private readonly approveCareRequest: ApproveCareRequestUseCase,
    private readonly declineCareRequest: DeclineCareRequestUseCase,
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

  @Get('transactions')
  @ApiOperation({ summary: 'List payment transactions for one market' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  async transactions(@Query() query: TransactionsQueryDto): Promise<TransactionListResponseDto> {
    const result = await this.listTransactions.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return TransactionListResponseDto.fromResult(result);
  }

  @Get('renewals')
  @ApiOperation({ summary: 'Upcoming renewals timeline: today, this week, next week' })
  @ApiOkResponse({ type: RenewalsResponseDto })
  async renewals(@Query() query: PlansBillingQueryDto): Promise<RenewalsResponseDto> {
    const result = await this.getRenewals.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return RenewalsResponseDto.fromResult(result);
  }

  @Get('care-requests')
  @ApiOperation({ summary: 'The care request queue (defaults to pending)' })
  @ApiOkResponse({ type: CareRequestListResponseDto })
  async careRequests(@Query() query: CareRequestsQueryDto): Promise<CareRequestListResponseDto> {
    const result = await this.listCareRequests.execute({
      status: query.status ?? CareRequestStatus.PENDING,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return CareRequestListResponseDto.fromResult(result);
  }

  @Post('care-requests/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve a pending care request' })
  @ApiNoContentResponse()
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.approveCareRequest.execute({ requestId: id, adminId: principal.adminUserId });
  }

  @Post('care-requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline a pending care request' })
  @ApiNoContentResponse()
  async decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DeclineCareRequestRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.declineCareRequest.execute({
      requestId: id,
      adminId: principal.adminUserId,
      note: body.note ?? null,
    });
  }
}
