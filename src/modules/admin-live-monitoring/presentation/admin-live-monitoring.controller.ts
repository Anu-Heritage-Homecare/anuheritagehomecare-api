import {
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
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { LiveFilters } from '../application/live-monitoring.util';
import { GetLiveOverviewUseCase } from '../application/use-cases/get-live-overview.use-case';
import { DispatchSosUseCase } from '../application/use-cases/dispatch-sos.use-case';
import {
  AcknowledgeAlertUseCase,
  ResolveAlertUseCase,
} from '../application/use-cases/manage-alert.use-case';
import {
  GetMapViewUseCase,
  ListActiveVisitsUseCase,
  ListAttentionUseCase,
} from '../application/use-cases/live-monitoring-tabs.use-case';
import { ActiveVisitsQueryDto, LiveMonitoringQueryDto } from './dto/live-monitoring-query.dto';
import {
  LiveAttentionResponseDto,
  LiveMapResponseDto,
  LiveOverviewResponseDto,
  LiveVisitPageResponseDto,
} from './dto/live-monitoring-response.dto';

function toFilters(query: LiveMonitoringQueryDto): LiveFilters {
  return { branch: query.branch ?? null, serviceType: query.serviceType ?? null };
}

/**
 * Admin Live Monitoring: the real time operations screen. Reads the KPIs, the
 * active visit summary, the attention required panel, the activity feed and the map
 * feed, and drives the Emergency Dispatch of an SOS. Requires a valid admin token.
 */
@ApiTags('admin-live-monitoring')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/live-monitoring', version: '1' })
export class AdminLiveMonitoringController {
  constructor(
    private readonly getOverview: GetLiveOverviewUseCase,
    private readonly listActiveVisits: ListActiveVisitsUseCase,
    private readonly listAttention: ListAttentionUseCase,
    private readonly getMapView: GetMapViewUseCase,
    private readonly dispatchSos: DispatchSosUseCase,
    private readonly acknowledgeAlert: AcknowledgeAlertUseCase,
    private readonly resolveAlert: ResolveAlertUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'The Live Monitoring overview: KPIs, active visits, attention and activity',
  })
  @ApiOkResponse({ type: LiveOverviewResponseDto })
  async overview(@Query() query: LiveMonitoringQueryDto): Promise<LiveOverviewResponseDto> {
    const result = await this.getOverview.execute(toFilters(query));
    return LiveOverviewResponseDto.fromResult(result);
  }

  @Get('active-visits')
  @ApiOperation({ summary: 'The Active Visits tab (paginated)' })
  @ApiOkResponse({ type: LiveVisitPageResponseDto })
  async activeVisits(@Query() query: ActiveVisitsQueryDto): Promise<LiveVisitPageResponseDto> {
    const result = await this.listActiveVisits.execute({
      ...toFilters(query),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return LiveVisitPageResponseDto.fromResult(result);
  }

  @Get('attention')
  @ApiOperation({ summary: 'The Attention Required tab' })
  @ApiOkResponse({ type: [LiveAttentionResponseDto] })
  async attention(): Promise<LiveAttentionResponseDto[]> {
    const result = await this.listAttention.execute();
    return result.map((a) => LiveAttentionResponseDto.fromResult(a));
  }

  @Get('map')
  @ApiOperation({ summary: 'The Map View data feed' })
  @ApiOkResponse({ type: LiveMapResponseDto })
  async map(@Query() query: LiveMonitoringQueryDto): Promise<LiveMapResponseDto> {
    const result = await this.getMapView.execute(toFilters(query));
    return LiveMapResponseDto.fromResult(result);
  }

  @Post('sos/:id/dispatch')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Emergency Dispatch / Escalate: record a dispatch for an active SOS alert',
  })
  @ApiNoContentResponse()
  async dispatch(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.dispatchSos.execute(id);
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Acknowledge an operational alert' })
  @ApiNoContentResponse()
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.acknowledgeAlert.execute(id, principal.adminUserId);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resolve an operational alert' })
  @ApiNoContentResponse()
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.resolveAlert.execute(id, principal.adminUserId);
  }
}
