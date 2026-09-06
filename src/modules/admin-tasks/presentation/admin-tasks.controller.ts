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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { CreateTaskUseCase } from '../application/use-cases/create-task.use-case';
import { ListTasksUseCase } from '../application/use-cases/list-tasks.use-case';
import { UpdateTaskStatusUseCase } from '../application/use-cases/update-task-status.use-case';
import { CreateTaskRequestDto, ListTasksQueryDto } from './dto/task-request.dto';
import { TaskListResponseDto, TaskResponseDto } from './dto/task-response.dto';

/**
 * Admin operational tasks: coordinators create tasks, list them (optionally by
 * status) and move them through their lifecycle. Every route requires a valid
 * admin token. Controllers stay thin.
 */
@ApiTags('admin-tasks')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/tasks', version: '1' })
export class AdminTasksController {
  constructor(
    private readonly createTask: CreateTaskUseCase,
    private readonly listTasks: ListTasksUseCase,
    private readonly updateStatus: UpdateTaskStatusUseCase,
  ) {}

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
      assignedToAdminId: body.assignedToAdminId ?? null,
      relatedCareRecipientId: body.relatedCareRecipientId ?? null,
      dueAt: body.dueAt === undefined ? null : new Date(body.dueAt),
    });
    return TaskResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'List operational tasks, optionally filtered by status' })
  @ApiOkResponse({ type: TaskListResponseDto })
  async list(@Query() query: ListTasksQueryDto): Promise<TaskListResponseDto> {
    const results = await this.listTasks.execute(query.status ?? null);
    return TaskListResponseDto.fromResults(results);
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
}
