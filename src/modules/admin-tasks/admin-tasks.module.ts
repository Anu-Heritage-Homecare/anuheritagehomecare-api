import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { UpdateTaskStatusUseCase } from './application/use-cases/update-task-status.use-case';
import { OPERATIONAL_TASK_REPOSITORY } from './domain/operational-task.repository';
import { OperationalTaskPrismaRepository } from './infrastructure/persistence/operational-task-prisma.repository';
import { AdminTasksController } from './presentation/admin-tasks.controller';

/**
 * Admin tasks bounded context composition root. The repository is exported so the
 * dashboard can read the open task count without depending on the tasks internals.
 */
@Module({
  imports: [PassportModule],
  controllers: [AdminTasksController],
  providers: [
    CreateTaskUseCase,
    ListTasksUseCase,
    UpdateTaskStatusUseCase,
    { provide: OPERATIONAL_TASK_REPOSITORY, useClass: OperationalTaskPrismaRepository },
  ],
  exports: [OPERATIONAL_TASK_REPOSITORY],
})
export class AdminTasksModule {}
