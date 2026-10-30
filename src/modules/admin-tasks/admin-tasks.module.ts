import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TASK_CHILD_STORE } from './application/ports/task-child.store';
import { TASK_DETAIL_READ_MODEL } from './application/ports/task-detail-read.port';
import { TASK_SETTINGS_STORE } from './application/ports/task-settings.store';
import { TASKS_READ_MODEL } from './application/ports/tasks-read.port';
import { AddTaskCommentUseCase } from './application/use-cases/add-task-comment.use-case';
import {
  BulkAssignTasksUseCase,
  BulkCompleteTasksUseCase,
} from './application/use-cases/bulk-tasks.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { GetTaskDetailUseCase } from './application/use-cases/get-task-detail.use-case';
import { GetTaskTemplatesScreenUseCase } from './application/use-cases/get-task-templates-screen.use-case';
import { GetTasksScreenUseCase } from './application/use-cases/get-tasks-screen.use-case';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { GetTaskSettingsUseCase } from './application/use-cases/get-task-settings.use-case';
import { SetChecklistItemUseCase } from './application/use-cases/set-checklist-item.use-case';
import {
  CreateTaskTemplateUseCase,
  DeleteTaskTemplateUseCase,
  DuplicateTaskTemplateUseCase,
  InstantiateTaskTemplateUseCase,
  SetTaskTemplateActiveUseCase,
  UpdateTaskTemplateUseCase,
} from './application/use-cases/task-templates.use-case';
import {
  UpdateCategorySettingUseCase,
  UpdateNotificationSettingUseCase,
  UpdatePrioritySettingUseCase,
} from './application/use-cases/update-task-settings.use-case';
import { UpdateTaskStatusUseCase } from './application/use-cases/update-task-status.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { OPERATIONAL_TASK_REPOSITORY } from './domain/operational-task.repository';
import { TASK_TEMPLATE_REPOSITORY } from './domain/task-template.repository';
import { OperationalTaskPrismaRepository } from './infrastructure/persistence/operational-task-prisma.repository';
import { TaskChildStorePrisma } from './infrastructure/persistence/task-child-store.prisma';
import { TaskDetailReadPrisma } from './infrastructure/persistence/task-detail-read.prisma';
import { TaskSettingsStorePrisma } from './infrastructure/persistence/task-settings-store.prisma';
import { TasksReadPrisma } from './infrastructure/persistence/tasks-read.prisma';
import { TaskTemplatePrismaRepository } from './infrastructure/persistence/task-template-prisma.repository';
import { AdminTasksController } from './presentation/admin-tasks.controller';

/**
 * Admin tasks bounded context composition root. The repository is exported so the
 * dashboard can read the open task count without depending on the tasks internals.
 */
@Module({
  imports: [PassportModule],
  controllers: [AdminTasksController],
  providers: [
    GetTasksScreenUseCase,
    GetTaskDetailUseCase,
    CreateTaskUseCase,
    UpdateTaskUseCase,
    ListTasksUseCase,
    UpdateTaskStatusUseCase,
    DeleteTaskUseCase,
    SetChecklistItemUseCase,
    AddTaskCommentUseCase,
    BulkAssignTasksUseCase,
    BulkCompleteTasksUseCase,
    GetTaskTemplatesScreenUseCase,
    CreateTaskTemplateUseCase,
    UpdateTaskTemplateUseCase,
    DuplicateTaskTemplateUseCase,
    SetTaskTemplateActiveUseCase,
    DeleteTaskTemplateUseCase,
    InstantiateTaskTemplateUseCase,
    GetTaskSettingsUseCase,
    UpdateCategorySettingUseCase,
    UpdatePrioritySettingUseCase,
    UpdateNotificationSettingUseCase,
    { provide: OPERATIONAL_TASK_REPOSITORY, useClass: OperationalTaskPrismaRepository },
    { provide: TASK_TEMPLATE_REPOSITORY, useClass: TaskTemplatePrismaRepository },
    { provide: TASKS_READ_MODEL, useClass: TasksReadPrisma },
    { provide: TASK_DETAIL_READ_MODEL, useClass: TaskDetailReadPrisma },
    { provide: TASK_CHILD_STORE, useClass: TaskChildStorePrisma },
    { provide: TASK_SETTINGS_STORE, useClass: TaskSettingsStorePrisma },
  ],
  exports: [OPERATIONAL_TASK_REPOSITORY],
})
export class AdminTasksModule {}
