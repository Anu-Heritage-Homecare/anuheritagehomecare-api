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
import { AdvanceApplicationStageUseCase } from '../application/use-cases/advance-application-stage.use-case';
import { ApproveCareRequestUseCase } from '../application/use-cases/approve-care-request.use-case';
import { AssignApplicationCoordinatorUseCase } from '../application/use-cases/assign-application-coordinator.use-case';
import { CancelSubscriptionUseCase } from '../application/use-cases/cancel-subscription.use-case';
import { ChangeSubscriptionPlanUseCase } from '../application/use-cases/change-subscription-plan.use-case';
import { DeclineCareRequestUseCase } from '../application/use-cases/decline-care-request.use-case';
import { GetOnboardingPipelineUseCase } from '../application/use-cases/get-onboarding-pipeline.use-case';
import { GetOperationsPanelUseCase } from '../application/use-cases/get-operations-panel.use-case';
import { GetPlanPerformanceUseCase } from '../application/use-cases/get-plan-performance.use-case';
import { GetPlansBillingOverviewUseCase } from '../application/use-cases/get-plans-billing-overview.use-case';
import { GetRenewalsTimelineUseCase } from '../application/use-cases/get-renewals-timeline.use-case';
import { GetSubscriptionStatusUseCase } from '../application/use-cases/get-subscription-status.use-case';
import { ListApplicationsUseCase } from '../application/use-cases/list-applications.use-case';
import { ListCareRequestsUseCase } from '../application/use-cases/list-care-requests.use-case';
import { SetApplicationStatusUseCase } from '../application/use-cases/set-application-status.use-case';
import { ListPlanSubscriptionsUseCase } from '../application/use-cases/list-plan-subscriptions.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import {
  AdvanceApplicationRequestDto,
  AssignCoordinatorRequestDto,
  SetApplicationStatusRequestDto,
} from './dto/application-action.dto';
import { ApplicationListResponseDto } from './dto/application-list-response.dto';
import { ApplicationsQueryDto } from './dto/applications-query.dto';
import { CareRequestListResponseDto } from './dto/care-request-list-response.dto';
import { CareRequestsQueryDto } from './dto/care-requests-query.dto';
import { OnboardingPipelineResponseDto } from './dto/onboarding-pipeline-response.dto';
import { PlanPerformanceCardsResponseDto } from './dto/plan-performance-cards-response.dto';
import { SubscriptionStatusResponseDto } from './dto/subscription-status-response.dto';
import { ChangeSubscriptionPlanRequestDto } from './dto/change-subscription-plan.dto';
import { DeclineCareRequestRequestDto } from './dto/decline-care-request.dto';
import { OperationsPanelResponseDto } from './dto/operations-panel-response.dto';
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
    private readonly getOperations: GetOperationsPanelUseCase,
    private readonly getPipeline: GetOnboardingPipelineUseCase,
    private readonly listApplications: ListApplicationsUseCase,
    private readonly assignCoordinator: AssignApplicationCoordinatorUseCase,
    private readonly setApplicationStatus: SetApplicationStatusUseCase,
    private readonly advanceApplication: AdvanceApplicationStageUseCase,
    private readonly getSubscriptionStatus: GetSubscriptionStatusUseCase,
    private readonly getPlanPerformance: GetPlanPerformanceUseCase,
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

  @Get('subscription-status')
  @ApiOperation({ summary: 'Subscription status distribution donut for one market' })
  @ApiOkResponse({ type: SubscriptionStatusResponseDto })
  async subscriptionStatus(
    @Query() query: PlansBillingQueryDto,
  ): Promise<SubscriptionStatusResponseDto> {
    const result = await this.getSubscriptionStatus.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return SubscriptionStatusResponseDto.fromResult(result);
  }

  @Get('plan-performance')
  @ApiOperation({ summary: 'Care plan distribution and performance cards for one market' })
  @ApiOkResponse({ type: PlanPerformanceCardsResponseDto })
  async planPerformance(
    @Query() query: PlansBillingQueryDto,
  ): Promise<PlanPerformanceCardsResponseDto> {
    const result = await this.getPlanPerformance.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return PlanPerformanceCardsResponseDto.fromResult(result);
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

  @Get('operations')
  @ApiOperation({ summary: 'Flexible hours tracker and the command actions bar' })
  @ApiOkResponse({ type: OperationsPanelResponseDto })
  async operations(@Query() query: PlansBillingQueryDto): Promise<OperationsPanelResponseDto> {
    const result = await this.getOperations.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return OperationsPanelResponseDto.fromResult(result);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Commercial operations pipeline and the activation time KPI' })
  @ApiOkResponse({ type: OnboardingPipelineResponseDto })
  async pipeline(@Query() query: PlansBillingQueryDto): Promise<OnboardingPipelineResponseDto> {
    const result = await this.getPipeline.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
    });
    return OnboardingPipelineResponseDto.fromResult(result);
  }

  @Get('applications')
  @ApiOperation({ summary: 'The client onboarding verification queue' })
  @ApiOkResponse({ type: ApplicationListResponseDto })
  async applications(@Query() query: ApplicationsQueryDto): Promise<ApplicationListResponseDto> {
    const result = await this.listApplications.execute({
      currency: query.currency ?? Currency.UnitedStatesDollar,
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return ApplicationListResponseDto.fromResult(result);
  }

  @Post('applications/:id/coordinator')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign the coordinator on an onboarding application' })
  @ApiNoContentResponse()
  async assignApplicationCoordinator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignCoordinatorRequestDto,
  ): Promise<void> {
    await this.assignCoordinator.execute({
      applicationId: id,
      coordinatorId: body.coordinatorId,
    });
  }

  @Post('applications/:id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the verification status of an onboarding application' })
  @ApiNoContentResponse()
  async setApplicationStatusAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetApplicationStatusRequestDto,
  ): Promise<void> {
    await this.setApplicationStatus.execute({ applicationId: id, status: body.status });
  }

  @Post('applications/:id/advance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Advance an onboarding application to the next funnel stage' })
  @ApiNoContentResponse()
  async advanceApplicationStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdvanceApplicationRequestDto,
  ): Promise<void> {
    await this.advanceApplication.execute({
      applicationId: id,
      transition: body.transition,
      caregiverId: body.caregiverId ?? null,
    });
  }
}
