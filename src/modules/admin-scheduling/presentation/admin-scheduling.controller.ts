import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { GetAssignCandidatesUseCase } from '../application/use-cases/get-assign-candidates.use-case';
import { GetSchedulingConsoleUseCase } from '../application/use-cases/get-scheduling-console.use-case';
import { GetVisitDetailsUseCase } from '../application/use-cases/get-visit-details.use-case';
import {
  AssignVisitCaregiverUseCase,
  CancelVisitUseCase,
  EditVisitUseCase,
  RescheduleVisitUseCase,
  ScheduleVisitUseCase,
} from '../application/use-cases/manage-visits.use-case';
import {
  AddHolidayUseCase,
  GetSchedulingSettingsUseCase,
  RemoveHolidayUseCase,
  UpdateSchedulingSettingsUseCase,
} from '../application/use-cases/manage-scheduling-settings.use-case';
import {
  GetSchedulingCalendarUseCase,
  GetSchedulingConflictsUseCase,
  ListUnassignedVisitsUseCase,
} from '../application/use-cases/scheduling-tabs.use-case';
import { AssignCandidatesResponseDto } from './dto/assign-candidates-response.dto';
import {
  AssignCandidatesQueryDto,
  SchedulingCalendarQueryDto,
  SchedulingConflictsQueryDto,
  SchedulingConsoleQueryDto,
  UnassignedVisitsQueryDto,
} from './dto/scheduling-query.dto';
import {
  SchedulingCalendarDayResponseDto,
  SchedulingConflictResponseDto,
  SchedulingConsoleResponseDto,
  SchedulingVisitPageResponseDto,
} from './dto/scheduling-response.dto';
import { SchedulingSettingsResponseDto } from './dto/scheduling-settings-response.dto';
import { AddHolidayDto, UpdateSchedulingSettingsDto } from './dto/scheduling-settings.dto';
import {
  AssignVisitDto,
  EditVisitDto,
  RescheduleVisitDto,
  ScheduleVisitDto,
} from './dto/scheduling-write.dto';
import {
  VisitCarePlanDto,
  VisitCaregiverDto,
  VisitDetailResponseDto,
  VisitNoteDto,
  VisitRecipientDto,
  VisitTimelineEventDto,
} from './dto/visit-details-response.dto';

/**
 * Admin Scheduling console: the org wide visits operations screen. Reads the KPIs,
 * the Today's Schedule table, the unassigned and conflict tabs and the calendar,
 * and drives the schedule, assign, reschedule and cancel operations. Requires a
 * valid admin token. Controllers stay thin.
 */
@ApiTags('admin-scheduling')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/scheduling', version: '1' })
export class AdminSchedulingController {
  constructor(
    private readonly getConsole: GetSchedulingConsoleUseCase,
    private readonly listUnassigned: ListUnassignedVisitsUseCase,
    private readonly getConflicts: GetSchedulingConflictsUseCase,
    private readonly getCalendar: GetSchedulingCalendarUseCase,
    private readonly getVisitDetails: GetVisitDetailsUseCase,
    private readonly getAssignCandidates: GetAssignCandidatesUseCase,
    private readonly scheduleVisit: ScheduleVisitUseCase,
    private readonly assignVisit: AssignVisitCaregiverUseCase,
    private readonly rescheduleVisit: RescheduleVisitUseCase,
    private readonly editVisit: EditVisitUseCase,
    private readonly cancelVisit: CancelVisitUseCase,
    private readonly getSettings: GetSchedulingSettingsUseCase,
    private readonly updateSettings: UpdateSchedulingSettingsUseCase,
    private readonly addHoliday: AddHolidayUseCase,
    private readonly removeHoliday: RemoveHolidayUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "The Scheduling console: KPIs, tab counts and the Today's Schedule table",
  })
  @ApiOkResponse({ type: SchedulingConsoleResponseDto })
  async console(@Query() query: SchedulingConsoleQueryDto): Promise<SchedulingConsoleResponseDto> {
    const result = await this.getConsole.execute({
      date: query.date === undefined ? null : new Date(query.date),
      status: query.status ?? null,
      priority: query.priority ?? null,
      search: query.search ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
    return SchedulingConsoleResponseDto.fromResult(result);
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'The Unassigned Visits tab for a day' })
  @ApiOkResponse({ type: SchedulingVisitPageResponseDto })
  async unassigned(
    @Query() query: UnassignedVisitsQueryDto,
  ): Promise<SchedulingVisitPageResponseDto> {
    const result = await this.listUnassigned.execute({
      date: query.date === undefined ? null : new Date(query.date),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
    return SchedulingVisitPageResponseDto.fromResult(result);
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'The Conflicts and Alerts tab for a day' })
  @ApiOkResponse({ type: [SchedulingConflictResponseDto] })
  async conflicts(
    @Query() query: SchedulingConflictsQueryDto,
  ): Promise<SchedulingConflictResponseDto[]> {
    const result = await this.getConflicts.execute({
      date: query.date === undefined ? null : new Date(query.date),
    });
    return result.map((c) => SchedulingConflictResponseDto.fromResult(c));
  }

  @Get('calendar')
  @ApiOperation({ summary: 'The Calendar feed: visits grouped by day for a range' })
  @ApiOkResponse({ type: [SchedulingCalendarDayResponseDto] })
  async calendar(
    @Query() query: SchedulingCalendarQueryDto,
  ): Promise<SchedulingCalendarDayResponseDto[]> {
    const now = new Date();
    const from = query.from === undefined ? now : new Date(query.from);
    const to = query.to === undefined ? from : new Date(query.to);
    const result = await this.getCalendar.execute({ from, to });
    return result.map((d) => SchedulingCalendarDayResponseDto.fromResult(d));
  }

  @Get('settings')
  @ApiOperation({ summary: 'The Schedule Settings screen' })
  @ApiOkResponse({ type: SchedulingSettingsResponseDto })
  async settings(): Promise<SchedulingSettingsResponseDto> {
    const result = await this.getSettings.execute();
    return SchedulingSettingsResponseDto.fromResult(result);
  }

  @Put('settings')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Save the Schedule Settings sections' })
  @ApiNoContentResponse()
  async saveSettings(@Body() body: UpdateSchedulingSettingsDto): Promise<void> {
    const defaultDurations =
      body.defaultDurations === undefined
        ? undefined
        : body.defaultDurations.reduce<Record<string, number>>((acc, d) => {
            acc[d.visitType] = d.minutes;
            return acc;
          }, {});
    await this.updateSettings.execute({
      businessHours: body.businessHours,
      defaultDurations,
      rules: body.rules,
      travel: body.travel,
    });
  }

  @Post('settings/holidays')
  @ApiOperation({ summary: 'Add a holiday to the calendar' })
  @ApiCreatedResponse()
  async createHoliday(@Body() body: AddHolidayDto): Promise<{ id: string }> {
    return this.addHoliday.execute({
      name: body.name,
      date: new Date(body.date),
      policy: body.policy,
    });
  }

  @Delete('settings/holidays/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a holiday from the calendar' })
  @ApiNoContentResponse()
  async deleteHoliday(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.removeHoliday.execute(id);
  }

  @Get('visits/:id')
  @ApiOperation({ summary: 'The full Visit Details (all tabs)' })
  @ApiOkResponse({ type: VisitDetailResponseDto })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<VisitDetailResponseDto> {
    const result = await this.getVisitDetails.execute(id);
    return VisitDetailResponseDto.fromResult(result);
  }

  @Get('visits/:id/recipient')
  @ApiOperation({ summary: 'The Visit Details Recipient tab' })
  @ApiOkResponse({ type: VisitRecipientDto })
  async visitRecipient(@Param('id', ParseUUIDPipe) id: string): Promise<VisitRecipientDto> {
    return (await this.getVisitDetails.execute(id)).recipient;
  }

  @Get('visits/:id/caregiver')
  @ApiOperation({ summary: 'The Visit Details Caregiver tab' })
  @ApiOkResponse({ type: VisitCaregiverDto })
  async visitCaregiver(@Param('id', ParseUUIDPipe) id: string): Promise<VisitCaregiverDto | null> {
    return (await this.getVisitDetails.execute(id)).caregiver;
  }

  @Get('visits/:id/care-plan')
  @ApiOperation({ summary: 'The Visit Details Care Plan tab' })
  @ApiOkResponse({ type: VisitCarePlanDto })
  async visitCarePlan(@Param('id', ParseUUIDPipe) id: string): Promise<VisitCarePlanDto> {
    return (await this.getVisitDetails.execute(id)).carePlan;
  }

  @Get('visits/:id/notes')
  @ApiOperation({ summary: 'The Visit Details Notes tab' })
  @ApiOkResponse({ type: [VisitNoteDto] })
  async visitNotes(@Param('id', ParseUUIDPipe) id: string): Promise<VisitNoteDto[]> {
    return (await this.getVisitDetails.execute(id)).notes;
  }

  @Get('visits/:id/history')
  @ApiOperation({ summary: 'The Visit Details History timeline tab' })
  @ApiOkResponse({ type: [VisitTimelineEventDto] })
  async visitHistory(@Param('id', ParseUUIDPipe) id: string): Promise<VisitTimelineEventDto[]> {
    return (await this.getVisitDetails.execute(id)).history;
  }

  @Get('visits/:id/candidates')
  @ApiOperation({
    summary: 'The Assign Caregiver screen: ranked caregivers for an unassigned visit',
  })
  @ApiOkResponse({ type: AssignCandidatesResponseDto })
  async candidates(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AssignCandidatesQueryDto,
  ): Promise<AssignCandidatesResponseDto> {
    const result = await this.getAssignCandidates.execute({
      visitId: id,
      search: query.search ?? null,
      branch: query.branch ?? null,
      availableNow: query.availableNow ?? false,
      sort: query.sort ?? 'BEST_MATCH',
    });
    return AssignCandidatesResponseDto.fromResult(result);
  }

  @Post('visits')
  @ApiOperation({ summary: 'Schedule (create) a new visit' })
  @ApiCreatedResponse()
  async create(@Body() body: ScheduleVisitDto): Promise<{ id: string }> {
    return this.scheduleVisit.execute({
      careRecipientId: body.careRecipientId,
      caregiverId: body.caregiverId ?? null,
      scheduledDate: new Date(body.scheduledDate),
      startMinute: body.startMinute,
      endMinute: body.endMinute ?? null,
      visitType: body.visitType,
      priority: body.priority,
      tasks: body.tasks ?? [],
      specialInstructions: body.specialInstructions ?? [],
    });
  }

  @Post('visits/:id/assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a caregiver to a visit' })
  @ApiNoContentResponse()
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignVisitDto,
  ): Promise<void> {
    await this.assignVisit.execute({ visitId: id, caregiverId: body.caregiverId });
  }

  @Post('visits/:id/reschedule')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reschedule a visit to a new day and time' })
  @ApiNoContentResponse()
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleVisitDto,
  ): Promise<void> {
    await this.rescheduleVisit.execute({
      visitId: id,
      scheduledDate: new Date(body.scheduledDate),
      startMinute: body.startMinute,
      endMinute: body.endMinute,
    });
  }

  @Put('visits/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Edit a scheduled visit's details" })
  @ApiNoContentResponse()
  async edit(@Param('id', ParseUUIDPipe) id: string, @Body() body: EditVisitDto): Promise<void> {
    await this.editVisit.execute({
      visitId: id,
      scheduledDate: body.scheduledDate === undefined ? null : new Date(body.scheduledDate),
      startMinute: body.startMinute ?? null,
      endMinute: body.endMinute ?? null,
      visitType: body.visitType,
      priority: body.priority,
      tasks: body.tasks,
      specialInstructions: body.specialInstructions,
    });
  }

  @Post('visits/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a scheduled visit' })
  @ApiNoContentResponse()
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.cancelVisit.execute({ visitId: id });
  }
}
