import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskCategory } from '../../domain/task-category.enum';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskResult, toTaskResult } from '../dto/task.result';

export interface UpdateTaskCommand {
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  category?: TaskCategory;
  assignedToAdminId?: string | null;
  assigneeLabel?: string | null;
  relatedCareRecipientId?: string | null;
  relatedVisitId?: string | null;
  dueAt?: Date | null;
  recurrenceLabel?: string | null;
  estimatedMinutes?: number | null;
}

/** Use case: revise a task's editable fields. */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateTaskCommand): Promise<TaskResult> {
    const task = await this.tasks.findById(command.taskId);
    if (task === null) {
      throw new NotFoundDomainException('Task not found');
    }
    const { taskId: _taskId, ...fields } = command;
    task.edit(fields, this.clock.now());
    await this.tasks.save(task);
    return toTaskResult(task);
  }
}
