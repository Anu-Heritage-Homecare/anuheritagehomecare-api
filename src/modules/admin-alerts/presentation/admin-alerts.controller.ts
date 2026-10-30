import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { EmergencyProtocolStep } from '../domain/emergency-protocol-step.enum';
import { AcknowledgeEmergencyUseCase } from '../application/use-cases/acknowledge-emergency.use-case';
import { AssignIncidentCoordinatorUseCase } from '../application/use-cases/assign-incident-coordinator.use-case';
import { GetAlertsOverviewUseCase } from '../application/use-cases/get-alerts-overview.use-case';
import { GetEmergencyDetailUseCase } from '../application/use-cases/get-emergency-detail.use-case';
import { GetIncidentCommunicationsUseCase } from '../application/use-cases/get-incident-communications.use-case';
import { GetIncidentDetailUseCase } from '../application/use-cases/get-incident-detail.use-case';
import { GetIncidentResolutionUseCase } from '../application/use-cases/get-incident-resolution.use-case';
import { GetIncidentTimelineUseCase } from '../application/use-cases/get-incident-timeline.use-case';
import { GetResolvedOverviewUseCase } from '../application/use-cases/get-resolved-overview.use-case';
import { ListIncidentsUseCase } from '../application/use-cases/list-incidents.use-case';
import {
  IncidentAction,
  ManageIncidentUseCase,
} from '../application/use-cases/manage-incident.use-case';
import { ListOpenAlertsUseCase } from '../application/use-cases/list-open-alerts.use-case';
import { LogIncidentTimelineEventUseCase } from '../application/use-cases/log-incident-timeline-event.use-case';
import { LogResponseEventUseCase } from '../application/use-cases/log-response-event.use-case';
import { RecordIncidentCommunicationUseCase } from '../application/use-cases/record-incident-communication.use-case';
import { SaveIncidentResolutionUseCase } from '../application/use-cases/save-incident-resolution.use-case';
import { ProgressAlertUseCase } from '../application/use-cases/progress-alert.use-case';
import { ReportIncidentUseCase } from '../application/use-cases/report-incident.use-case';
import { ResolveAlertUseCase } from '../application/use-cases/resolve-alert.use-case';
import { ResolveEmergencyUseCase } from '../application/use-cases/resolve-emergency.use-case';
import { ToggleProtocolStepUseCase } from '../application/use-cases/toggle-protocol-step.use-case';
import { AlertListResponseDto, AlertResponseDto } from './dto/alert-response.dto';
import { AlertsOverviewQueryDto } from './dto/alerts-overview-query.dto';
import { AlertsOverviewResponseDto } from './dto/alerts-overview-response.dto';
import {
  AcknowledgeEmergencyDto,
  LogResponseEventDto,
  ToggleProtocolStepDto,
} from './dto/emergency-action.dto';
import { AssignCoordinatorDto } from './dto/assign-coordinator.dto';
import { EmergencyDetailResponseDto } from './dto/emergency-detail-response.dto';
import { IncidentDetailResponseDto } from './dto/incident-detail-response.dto';
import { IncidentListResponseDto, IncidentRowDto } from './dto/incident-response.dto';
import { IncidentCommunicationsResponseDto } from './dto/incident-communications-response.dto';
import { IncidentResolutionResponseDto } from './dto/incident-resolution-response.dto';
import { IncidentTimelineResponseDto } from './dto/incident-timeline-response.dto';
import { LogIncidentTimelineEventDto } from './dto/log-incident-timeline-event.dto';
import { RecordCommunicationDto } from './dto/record-communication.dto';
import { SaveResolutionDto } from './dto/save-resolution.dto';
import { ReportIncidentDto } from './dto/report-incident.dto';
import { ResolvedOverviewResponseDto } from './dto/resolved-overview-response.dto';

/**
 * Admin operational alerts: the coordinator reads the open alerts and closes one
 * by resolving (actioned) or dismissing (no action needed). Every route requires a
 * valid admin token. Controllers stay thin, translating HTTP into use case calls.
 */
@ApiTags('admin-alerts')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/alerts', version: '1' })
export class AdminAlertsController {
  constructor(
    private readonly listOpen: ListOpenAlertsUseCase,
    private readonly closeAlert: ResolveAlertUseCase,
    private readonly getOverview: GetAlertsOverviewUseCase,
    private readonly progressAlert: ProgressAlertUseCase,
    private readonly listIncidents: ListIncidentsUseCase,
    private readonly reportIncident: ReportIncidentUseCase,
    private readonly getEmergency: GetEmergencyDetailUseCase,
    private readonly acknowledgeEmergency: AcknowledgeEmergencyUseCase,
    private readonly toggleStep: ToggleProtocolStepUseCase,
    private readonly logEvent: LogResponseEventUseCase,
    private readonly getResolved: GetResolvedOverviewUseCase,
    private readonly resolveEmergency: ResolveEmergencyUseCase,
    private readonly getIncident: GetIncidentDetailUseCase,
    private readonly manageIncident: ManageIncidentUseCase,
    private readonly assignCoordinator: AssignIncidentCoordinatorUseCase,
    private readonly getIncidentTimeline: GetIncidentTimelineUseCase,
    private readonly logIncidentTimeline: LogIncidentTimelineEventUseCase,
    private readonly getIncidentComms: GetIncidentCommunicationsUseCase,
    private readonly recordIncidentComm: RecordIncidentCommunicationUseCase,
    private readonly getIncidentResolution: GetIncidentResolutionUseCase,
    private readonly saveIncidentResolution: SaveIncidentResolutionUseCase,
  ) {}

  @Get('incidents/:id/resolution')
  @ApiOperation({ summary: 'The Incident Detail Resolution tab: the resolution form' })
  @ApiOkResponse({ type: IncidentResolutionResponseDto })
  async incidentResolution(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IncidentResolutionResponseDto> {
    const result = await this.getIncidentResolution.execute(id);
    return IncidentResolutionResponseDto.fromResult(result);
  }

  @Put('incidents/:id/resolution')
  @ApiOperation({ summary: 'Save the incident resolution form (does not resolve)' })
  @ApiOkResponse({ type: IncidentResolutionResponseDto })
  async saveResolution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveResolutionDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<IncidentResolutionResponseDto> {
    const result = await this.saveIncidentResolution.execute({
      incidentId: id,
      ...dto,
      markResolved: false,
      adminId: principal.adminUserId,
    });
    return IncidentResolutionResponseDto.fromResult(result);
  }

  @Post('incidents/:id/resolution/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark the incident resolved, saving the resolution form' })
  @ApiOkResponse({ type: IncidentResolutionResponseDto })
  async markResolved(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveResolutionDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<IncidentResolutionResponseDto> {
    const result = await this.saveIncidentResolution.execute({
      incidentId: id,
      ...dto,
      markResolved: true,
      adminId: principal.adminUserId,
    });
    return IncidentResolutionResponseDto.fromResult(result);
  }

  @Get('incidents/:id/communications')
  @ApiOperation({ summary: 'The Incident Detail Communication tab: the log and contact book' })
  @ApiOkResponse({ type: IncidentCommunicationsResponseDto })
  async incidentCommunications(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IncidentCommunicationsResponseDto> {
    const result = await this.getIncidentComms.execute(id);
    return IncidentCommunicationsResponseDto.fromResult(result);
  }

  @Post('incidents/:id/communications')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a documented communication regarding an incident' })
  async recordIncidentCommunication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordCommunicationDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.recordIncidentComm.execute({
      incidentId: id,
      channel: dto.channel,
      outcome: dto.outcome,
      contactName: dto.contactName,
      contactRole: dto.contactRole ?? null,
      notes: dto.notes ?? null,
      adminId: principal.adminUserId,
    });
  }

  @Get('incidents/:id/timeline')
  @ApiOperation({ summary: 'The Incident Detail Timeline: the incident history, oldest first' })
  @ApiOkResponse({ type: IncidentTimelineResponseDto })
  async incidentTimeline(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IncidentTimelineResponseDto> {
    const result = await this.getIncidentTimeline.execute(id);
    return IncidentTimelineResponseDto.fromResult(result);
  }

  @Post('incidents/:id/timeline')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Append an entry to an incident history timeline' })
  async appendIncidentTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogIncidentTimelineEventDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.logIncidentTimeline.execute({
      incidentId: id,
      kind: dto.kind,
      title: dto.title,
      description: dto.description,
      actorName: dto.actorName ?? null,
      actorRole: dto.actorRole ?? null,
      adminId: principal.adminUserId,
    });
  }

  @Get('incidents/:id')
  @ApiOperation({
    summary: 'The Incident Detail (Overview): incident, recipient, caregiver, visit',
  })
  @ApiOkResponse({ type: IncidentDetailResponseDto })
  async incidentDetail(@Param('id', ParseUUIDPipe) id: string): Promise<IncidentDetailResponseDto> {
    const result = await this.getIncident.execute(id);
    return IncidentDetailResponseDto.fromResult(result);
  }

  @Post('incidents/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start reviewing an incident (assigns the acting coordinator)' })
  async reviewIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.runIncidentAction(id, 'REVIEW', principal);
  }

  @Post('incidents/:id/escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate an incident (raises its priority)' })
  async escalateIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.runIncidentAction(id, 'ESCALATE', principal);
  }

  @Post('incidents/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an incident' })
  async resolveIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.runIncidentAction(id, 'RESOLVE', principal);
  }

  @Post('incidents/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an incident with no further action' })
  async closeIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.runIncidentAction(id, 'CLOSE', principal);
  }

  @Post('incidents/:id/coordinator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign the coordinator handling an incident' })
  async assignIncidentCoordinator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCoordinatorDto,
  ): Promise<void> {
    await this.assignCoordinator.execute({
      incidentId: id,
      coordinatorAdminId: dto.coordinatorAdminId,
    });
  }

  private async runIncidentAction(
    id: string,
    action: IncidentAction,
    principal: AdminPrincipal,
  ): Promise<void> {
    await this.manageIncident.execute({ incidentId: id, action, adminId: principal.adminUserId });
  }

  @Get('resolved')
  @ApiOperation({ summary: 'The Resolved tab: resolved alerts, incidents and emergencies' })
  @ApiOkResponse({ type: ResolvedOverviewResponseDto })
  async resolved(): Promise<ResolvedOverviewResponseDto> {
    const result = await this.getResolved.execute();
    return ResolvedOverviewResponseDto.fromResult(result);
  }

  @Get('emergencies/:id')
  @ApiOperation({ summary: 'An SOS emergency detail: details, response protocol and timeline' })
  @ApiOkResponse({ type: EmergencyDetailResponseDto })
  async emergency(@Param('id', ParseUUIDPipe) id: string): Promise<EmergencyDetailResponseDto> {
    const result = await this.getEmergency.execute(id);
    return EmergencyDetailResponseDto.fromResult(result);
  }

  @Post('emergencies/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an SOS emergency and assign the response' })
  async acknowledgeEmergencyAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeEmergencyDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.acknowledgeEmergency.execute({
      sosAlertId: id,
      adminId: principal.adminUserId,
      assignedTo: dto.assignedTo ?? null,
    });
  }

  @Post('emergencies/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve (close out) an SOS emergency' })
  async resolveEmergencyAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.resolveEmergency.execute({ sosAlertId: id, adminId: principal.adminUserId });
  }

  @Post('emergencies/:id/steps/:step')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tick or un-tick an emergency response protocol step' })
  async toggleProtocolStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('step', new ParseEnumPipe(EmergencyProtocolStep)) step: EmergencyProtocolStep,
    @Body() dto: ToggleProtocolStepDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.toggleStep.execute({
      sosAlertId: id,
      step,
      completed: dto.completed,
      adminId: principal.adminUserId,
    });
  }

  @Post('emergencies/:id/events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Append a timeline entry to an SOS emergency' })
  async logResponseEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogResponseEventDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.logEvent.execute({
      sosAlertId: id,
      kind: dto.kind,
      description: dto.description ?? null,
      adminId: principal.adminUserId,
    });
  }

  @Get('incidents')
  @ApiOperation({ summary: 'The Incidents tab: open incidents plus those resolved today' })
  @ApiOkResponse({ type: IncidentListResponseDto })
  async incidents(): Promise<IncidentListResponseDto> {
    const result = await this.listIncidents.execute();
    return IncidentListResponseDto.fromResult(result);
  }

  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'File a new incident' })
  @ApiCreatedResponse({ type: IncidentRowDto })
  async report(
    @Body() dto: ReportIncidentDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<IncidentRowDto> {
    const result = await this.reportIncident.execute({
      category: dto.category,
      severity: dto.severity,
      detail: dto.detail ?? null,
      reporterName: dto.reporterName ?? null,
      reportedByAdminId: principal.adminUserId,
      relatedCareRecipientId: dto.relatedCareRecipientId ?? null,
      relatedVisitId: dto.relatedVisitId ?? null,
      relatedCaregiverId: dto.relatedCaregiverId ?? null,
    });
    return IncidentRowDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'List the open operational alerts, most severe first' })
  @ApiOkResponse({ type: AlertListResponseDto })
  async list(): Promise<AlertListResponseDto> {
    const results = await this.listOpen.execute();
    return AlertListResponseDto.fromResults(results);
  }

  @Get('overview')
  @ApiOperation({ summary: 'The Alerts and Incidents screen: KPIs, tab counts and the feed' })
  @ApiOkResponse({ type: AlertsOverviewResponseDto })
  async overview(@Query() query: AlertsOverviewQueryDto): Promise<AlertsOverviewResponseDto> {
    const result = await this.getOverview.execute({
      tab: query.tab ?? 'ALL',
      branch: query.branch ?? null,
      serviceType: query.serviceType ?? null,
    });
    return AlertsOverviewResponseDto.fromResult(result);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an alert (a coordinator has seen it)' })
  @ApiOkResponse({ type: AlertResponseDto })
  async acknowledge(@Param('id', ParseUUIDPipe) id: string): Promise<AlertResponseDto> {
    const result = await this.progressAlert.execute({ alertId: id, progress: 'ACKNOWLEDGE' });
    return AlertResponseDto.fromResult(result);
  }

  @Post(':id/investigate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an alert as being investigated' })
  @ApiOkResponse({ type: AlertResponseDto })
  async investigate(@Param('id', ParseUUIDPipe) id: string): Promise<AlertResponseDto> {
    const result = await this.progressAlert.execute({ alertId: id, progress: 'INVESTIGATE' });
    return AlertResponseDto.fromResult(result);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an alert (a coordinator actioned it)' })
  @ApiOkResponse({ type: AlertResponseDto })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<AlertResponseDto> {
    const result = await this.closeAlert.execute({
      alertId: id,
      adminId: principal.adminUserId,
      closure: 'RESOLVE',
    });
    return AlertResponseDto.fromResult(result);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss an alert (acknowledged, no action needed)' })
  @ApiOkResponse({ type: AlertResponseDto })
  async dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<AlertResponseDto> {
    const result = await this.closeAlert.execute({
      alertId: id,
      adminId: principal.adminUserId,
      closure: 'DISMISS',
    });
    return AlertResponseDto.fromResult(result);
  }
}
