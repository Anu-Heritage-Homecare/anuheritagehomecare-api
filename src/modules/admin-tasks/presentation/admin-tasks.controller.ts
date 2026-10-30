import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import {
  BulkAssignTasksUseCase,
  BulkCompleteTasksUseCase,
} from '../application/use-cases/bulk-tasks.use-case';
import { AddTaskCommentUseCase } from '../application/use-cases/add-task-comment.use-case';
import { CreateTaskUseCase } from '../application/use-cases/create-task.use-case';
import { DeleteTaskUseCase } from '../application/use-cases/delete-task.use-case';
import { GetTaskDetailUseCase } from '../application/use-cases/get-task-detail.use-case';
import { GetTaskSettingsUseCase } from '../application/use-cases/get-task-settings.use-case';
import { GetTaskTemplatesScreenUseCase } from '../application/use-cases/get-task-templates-screen.use-case';
import { GetTasksScreenUseCase } from '../application/use-cases/get-tasks-screen.use-case';
import { SetChecklistItemUseCase } from '../application/use-cases/set-checklist-item.use-case';
import {
  UpdateCategorySettingUseCase,
  UpdateNotificationSettingUseCase,
  UpdatePrioritySettingUseCase,
} from '../application/use-cases/update-task-settings.use-case';
import { NOTIFICATION_KEYS } from '../application/task-settings.defaults';
import { TaskCategory } from '../domain/task-category.enum';
import { TaskPriority } from '../domain/task-priority.enum';
import {
  CreateTaskTemplateUseCase,
  DeleteTaskTemplateUseCase,
  DuplicateTaskTemplateUseCase,
  InstantiateTaskTemplateUseCase,
  SetTaskTemplateActiveUseCase,
  UpdateTaskTemplateUseCase,
} from '../application/use-cases/task-templates.use-case';
import { UpdateTaskStatusUseCase } from '../application/use-cases/update-task-status.use-case';
import { UpdateTaskUseCase } from '../application/use-cases/update-task.use-case';
import {
  AddTaskCommentRequestDto,
  BulkAssignRequestDto,
  BulkCompleteRequestDto,
  CreateTaskRequestDto,
  CreateTemplateRequestDto,
  InstantiateTemplateRequestDto,
  SetChecklistItemRequestDto,
  TasksScreenQueryDto,
  TaskTemplatesQueryDto,
  UpdateCategorySettingRequestDto,
  UpdateNotificationSettingRequestDto,
  UpdatePrioritySettingRequestDto,
  UpdateTaskRequestDto,
  UpdateTemplateRequestDto,
} from './dto/task-request.dto';
import { TaskDetailResponseDto } from './dto/task-detail-response.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskSettingsResponseDto } from './dto/task-settings-response.dto';
import { TaskTemplatesScreenResponseDto } from './dto/task-templates-screen-response.dto';
import { BulkTaskResultDto, TaskTemplateResponseDto } from './dto/task-template-response.dto';
import { TasksScreenResponseDto } from './dto/tasks-screen-response.dto';

/**
 * Admin operational tasks: the Tasks screen (KPIs, filters, pagination), task
 * lifecycle, bulk operations and reusable templates. Every route requires a valid
 * admin token. Controllers stay thin.
 */
@ApiTags('admin-tasks')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/tasks', version: '1' })
export class AdminTasksController {
  constructor(
    private readonly getScreen: GetTasksScreenUseCase,
    private readonly getDetail: GetTaskDetailUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly updateStatus: UpdateTaskStatusUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly setChecklistItem: SetChecklistItemUseCase,
    private readonly addComment: AddTaskCommentUseCase,
    private readonly bulkAssign: BulkAssignTasksUseCase,
    private readonly bulkComplete: BulkCompleteTasksUseCase,
    private readonly templatesScreen: GetTaskTemplatesScreenUseCase,
    private readonly createTemplate: CreateTaskTemplateUseCase,
    private readonly updateTemplate: UpdateTaskTemplateUseCase,
    private readonly duplicateTemplate: DuplicateTaskTemplateUseCase,
    private readonly setTemplateActive: SetTaskTemplateActiveUseCase,
    private readonly deleteTemplate: DeleteTaskTemplateUseCase,
    private readonly instantiateTemplate: InstantiateTaskTemplateUseCase,
    private readonly taskSettings: GetTaskSettingsUseCase,
    private readonly updateCategorySetting: UpdateCategorySettingUseCase,
    private readonly updatePrioritySetting: UpdatePrioritySettingUseCase,
    private readonly updateNotificationSetting: UpdateNotificationSettingUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The Tasks screen: KPIs, tab counts and the filtered, paginated list' })
  @ApiOkResponse({ type: TasksScreenResponseDto })
  async screen(@Query() query: TasksScreenQueryDto): Promise<TasksScreenResponseDto> {
    const result = await this.getScreen.execute({
      tab: query.tab,
      search: query.search ?? null,
      assignedToAdminId: query.assignedToAdminId ?? null,
      assigneeLabel: query.assigneeLabel ?? null,
      priority: query.priority ?? null,
      category: query.category ?? null,
      status: query.status ?? null,
      page: query.page,
      pageSize: query.pageSize,
    });
    return TasksScreenResponseDto.fromResult(result);
  }

  @Post()
  @ApiOperation({ summary: 'Create an operational task' })
  @ApiOkResponse({ type: TaskResponseDto })
  async create(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: CreateTaskRequestDto,
  ): Promise<TaskResponseDto> {
    const result = await this.createTask.execute({
      createdByAdminId: principal.adminUserId,
      title: body.title,
      description: body.description ?? null,
      priority: body.priority,
      category: body.category,
      assignedToAdminId: body.assignedToAdminId ?? null,
      assigneeLabel: body.assigneeLabel ?? null,
      relatedCareRecipientId: body.relatedCareRecipientId ?? null,
      relatedVisitId: body.relatedVisitId ?? null,
      dueAt: body.dueAt === undefined ? null : new Date(body.dueAt),
      recurrenceLabel: body.recurrenceLabel ?? null,
      estimatedMinutes: body.estimatedMinutes ?? null,
      checklistItems: body.checklistItems,
    });
    return TaskResponseDto.fromResult(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Revise a task' })
  @ApiOkResponse({ type: TaskResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTaskRequestDto,
  ): Promise<TaskResponseDto> {
    const result = await this.updateTask.execute({
      taskId: id,
      title: body.title,
      description: body.description,
      priority: body.priority,
      category: body.category,
      assignedToAdminId: body.assignedToAdminId,
      assigneeLabel: body.assigneeLabel,
      relatedCareRecipientId: body.relatedCareRecipientId,
      relatedVisitId: body.relatedVisitId,
      dueAt: body.dueAt === undefined ? undefined : new Date(body.dueAt),
      recurrenceLabel: body.recurrenceLabel,
      estimatedMinutes: body.estimatedMinutes,
    });
    return TaskResponseDto.fromResult(result);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a task to in progress' })
  @ApiOkResponse({ type: TaskResponseDto })
  async start(@Param('id', ParseUUIDPipe) id: string): Promise<TaskResponseDto> {
    const result = await this.updateStatus.execute({ taskId: id, transition: 'START' });
    return TaskResponseDto.fromResult(result);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a task' })
  @ApiOkResponse({ type: TaskResponseDto })
  async complete(@Param('id', ParseUUIDPipe) id: string): Promise<TaskResponseDto> {
    const result = await this.updateStatus.execute({ taskId: id, transition: 'COMPLETE' });
    return TaskResponseDto.fromResult(result);
  }

  @Post('bulk/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk assign tasks to a coordinator or team' })
  @ApiOkResponse({ type: BulkTaskResultDto })
  async assignMany(@Body() body: BulkAssignRequestDto): Promise<BulkTaskResultDto> {
    const result = await this.bulkAssign.execute({
      taskIds: body.taskIds,
      assignedToAdminId: body.assignedToAdminId ?? null,
      assigneeLabel: body.assigneeLabel ?? null,
    });
    return { affected: result.updated };
  }

  @Post('bulk/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk complete the given tasks (Mark All Complete)' })
  @ApiOkResponse({ type: BulkTaskResultDto })
  async completeMany(@Body() body: BulkCompleteRequestDto): Promise<BulkTaskResultDto> {
    const result = await this.bulkComplete.execute({ taskIds: body.taskIds });
    return { affected: result.completed };
  }

  @Get('templates')
  @ApiOperation({ summary: 'The Task Templates screen: KPIs and the filtered template cards' })
  @ApiOkResponse({ type: TaskTemplatesScreenResponseDto })
  async templates(@Query() query: TaskTemplatesQueryDto): Promise<TaskTemplatesScreenResponseDto> {
    const result = await this.templatesScreen.execute({
      category: query.category ?? null,
      status: query.status ?? null,
      search: query.search ?? null,
    });
    return TaskTemplatesScreenResponseDto.fromResult(result);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a reusable task template' })
  @ApiOkResponse({ type: TaskTemplateResponseDto })
  async addTemplate(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: CreateTemplateRequestDto,
  ): Promise<TaskTemplateResponseDto> {
    const result = await this.createTemplate.execute({
      createdByAdminId: principal.adminUserId,
      name: body.name,
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      priority: body.priority,
      defaultAssigneeLabel: body.defaultAssigneeLabel ?? null,
      checklistItems: body.checklistItems,
      scheduleLabel: body.scheduleLabel ?? null,
      estimatedMinutes: body.estimatedMinutes ?? null,
    });
    return TaskTemplateResponseDto.fromResult(result);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Revise a task template' })
  @ApiOkResponse({ type: TaskTemplateResponseDto })
  async editTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTemplateRequestDto,
  ): Promise<TaskTemplateResponseDto> {
    const result = await this.updateTemplate.execute({
      templateId: id,
      name: body.name,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      defaultAssigneeLabel: body.defaultAssigneeLabel,
      checklistItems: body.checklistItems,
      scheduleLabel: body.scheduleLabel,
      estimatedMinutes: body.estimatedMinutes,
    });
    return TaskTemplateResponseDto.fromResult(result);
  }

  @Post('templates/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a task template' })
  @ApiOkResponse({ type: TaskTemplateResponseDto })
  async duplicateTemplateRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<TaskTemplateResponseDto> {
    const result = await this.duplicateTemplate.execute(id, principal.adminUserId);
    return TaskTemplateResponseDto.fromResult(result);
  }

  @Post('templates/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a task template' })
  @ApiOkResponse({ type: TaskTemplateResponseDto })
  async deactivateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskTemplateResponseDto> {
    const result = await this.setTemplateActive.execute(id, false);
    return TaskTemplateResponseDto.fromResult(result);
  }

  @Post('templates/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a task template' })
  @ApiOkResponse({ type: TaskTemplateResponseDto })
  async activateTemplate(@Param('id', ParseUUIDPipe) id: string): Promise<TaskTemplateResponseDto> {
    const result = await this.setTemplateActive.execute(id, true);
    return TaskTemplateResponseDto.fromResult(result);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task template' })
  async removeTemplate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteTemplate.execute(id);
  }

  @Post('templates/:id/instantiate')
  @ApiOperation({ summary: 'Create a task pre-filled from a template' })
  @ApiOkResponse({ type: TaskResponseDto })
  async useTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: InstantiateTemplateRequestDto,
  ): Promise<TaskResponseDto> {
    const result = await this.instantiateTemplate.execute({
      templateId: id,
      createdByAdminId: principal.adminUserId,
      dueAt: body.dueAt === undefined ? null : new Date(body.dueAt),
      assignedToAdminId: body.assignedToAdminId ?? null,
      assigneeLabel: body.assigneeLabel ?? null,
      relatedCareRecipientId: body.relatedCareRecipientId ?? null,
      relatedVisitId: body.relatedVisitId ?? null,
    });
    return TaskResponseDto.fromResult(result);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'The Task Settings screen: categories, priority levels and notifications',
  })
  @ApiOkResponse({ type: TaskSettingsResponseDto })
  async settings(): Promise<TaskSettingsResponseDto> {
    const result = await this.taskSettings.execute();
    return TaskSettingsResponseDto.fromResult(result);
  }

  @Put('settings/categories/:category')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a task category overlay (colour, icon, auto-assign, active)' })
  async editCategorySetting(
    @Param('category', new ParseEnumPipe(TaskCategory)) category: TaskCategory,
    @Body() body: UpdateCategorySettingRequestDto,
  ): Promise<void> {
    await this.updateCategorySetting.execute(category, body);
  }

  @Put('settings/priorities/:priority')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a priority level (colour, label, SLA, escalation, default)' })
  async editPrioritySetting(
    @Param('priority', new ParseEnumPipe(TaskPriority)) priority: TaskPriority,
    @Body() body: UpdatePrioritySettingRequestDto,
  ): Promise<void> {
    await this.updatePrioritySetting.execute(priority, body);
  }

  @Put('settings/notifications/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a notification preference (enabled, channels)' })
  async editNotificationSetting(
    @Param('key') key: string,
    @Body() body: UpdateNotificationSettingRequestDto,
  ): Promise<void> {
    if (!NOTIFICATION_KEYS.includes(key)) {
      throw new BadRequestException('Unknown notification key');
    }
    await this.updateNotificationSetting.execute(key, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'The task detail screen (overview, checklist, visit, notes, activity)' })
  @ApiOkResponse({ type: TaskDetailResponseDto })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<TaskDetailResponseDto> {
    const result = await this.getDetail.execute(id);
    return TaskDetailResponseDto.fromResult(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteTask.execute(id);
  }

  @Put(':id/checklist/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tick or untick a checklist item' })
  async checklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: SetChecklistItemRequestDto,
  ): Promise<void> {
    await this.setChecklistItem.execute({ taskId: id, itemId, done: body.done });
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add an operational comment to a task' })
  async comment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: AddTaskCommentRequestDto,
  ): Promise<void> {
    await this.addComment.execute({
      taskId: id,
      authorAdminId: principal.adminUserId,
      body: body.body,
    });
  }
}
