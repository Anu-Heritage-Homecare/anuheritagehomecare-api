import { Inject, Injectable } from '@nestjs/common';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskStatus } from '../../domain/task-status.enum';
import { TaskResult, toTaskResult } from '../dto/task.result';

const TASKS_LIMIT = 100;

/** Use case: list operational tasks, optionally filtered by status. */
@Injectable()
export class ListTasksUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
  ) {}

  async execute(statusFilter: TaskStatus | null): Promise<TaskResult[]> {
    const tasks = await this.tasks.list(statusFilter, TASKS_LIMIT);
    return tasks.map(toTaskResult);
  }
}
