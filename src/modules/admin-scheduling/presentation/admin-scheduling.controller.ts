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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { GetSchedulingConsoleUseCase } from '../application/use-cases/get-scheduling-console.use-case';
import {
  AssignVisitCaregiverUseCase,
  CancelVisitUseCase,
  RescheduleVisitUseCase,
  ScheduleVisitUseCase,
} from '../application/use-cases/manage-visits.use-case';
import {
  GetSchedulingCalendarUseCase,
  GetSchedulingConflictsUseCase,
  ListUnassignedVisitsUseCase,
} from '../application/use-cases/scheduling-tabs.use-case';
import {
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
import { AssignVisitDto, RescheduleVisitDto, ScheduleVisitDto } from './dto/scheduling-write.dto';

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
    private readonly scheduleVisit: ScheduleVisitUseCase,
    private readonly assignVisit: AssignVisitCaregiverUseCase,
    private readonly rescheduleVisit: RescheduleVisitUseCase,
    private readonly cancelVisit: CancelVisitUseCase,
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

  @Post('visits')
  @ApiOperation({ summary: 'Schedule (create) a new visit' })
  @ApiCreatedResponse()
  async create(@Body() body: ScheduleVisitDto): Promise<{ id: string }> {
    return this.scheduleVisit.execute({
      careRecipientId: body.careRecipientId,
      caregiverId: body.caregiverId ?? null,
      scheduledDate: new Date(body.scheduledDate),
      startMinute: body.startMinute,
      endMinute: body.endMinute,
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

  @Post('visits/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a scheduled visit' })
  @ApiNoContentResponse()
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.cancelVisit.execute({ visitId: id });
  }
}
