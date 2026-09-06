import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskResult, toTaskResult } from '../dto/task.result';

/** The transitions a coordinator can drive from the tasks list. */
export type TaskTransition = 'START' | 'COMPLETE';

export interface UpdateTaskStatusCommand {
  taskId: string;
  transition: TaskTransition;
}

/**
 * Use case: move a task through its lifecycle (start it, or complete it). Illegal
 * transitions are rejected by the aggregate.
 */
@Injectable()
export class UpdateTaskStatusUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateTaskStatusCommand): Promise<TaskResult> {
    const task = await this.tasks.findById(command.taskId);
    if (task === null) {
      throw new NotFoundDomainException('Task not found');
    }

    const now = this.clock.now();
    if (command.transition === 'START') {
      task.start(now);
    } else {
      task.complete(now);
    }

    await this.tasks.save(task);
    return toTaskResult(task);
  }
}
