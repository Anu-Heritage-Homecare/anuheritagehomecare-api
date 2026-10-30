import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskStatus } from '../../domain/task-status.enum';

export interface BulkAssignCommand {
  taskIds: string[];
  assignedToAdminId?: string | null;
  assigneeLabel?: string | null;
}

/** Bulk assign the given tasks to a coordinator or team. */
@Injectable()
export class BulkAssignTasksUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: BulkAssignCommand): Promise<{ updated: number }> {
    const now = this.clock.now();
    const tasks = await this.tasks.findByIds(command.taskIds);
    for (const task of tasks) {
      task.assignTo(command.assignedToAdminId ?? null, command.assigneeLabel ?? null, now);
      await this.tasks.save(task);
    }
    return { updated: tasks.length };
  }
}

/** Bulk complete the given tasks (ones already done are skipped). */
@Injectable()
export class BulkCompleteTasksUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { taskIds: string[] }): Promise<{ completed: number }> {
    const now = this.clock.now();
    const tasks = await this.tasks.findByIds(command.taskIds);
    let completed = 0;
    for (const task of tasks) {
      if (task.status === TaskStatus.Done) {
        continue;
      }
      task.complete(now);
      await this.tasks.save(task);
      completed += 1;
    }
    return { completed };
  }
}
