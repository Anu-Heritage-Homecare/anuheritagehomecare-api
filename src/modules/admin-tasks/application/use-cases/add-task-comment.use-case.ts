import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TASK_CHILD_STORE, TaskChildStore } from '../ports/task-child.store';

export interface AddTaskCommentCommand {
  taskId: string;
  authorAdminId: string;
  body: string;
}

/** Use case: add an operational comment to a task. */
@Injectable()
export class AddTaskCommentUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(TASK_CHILD_STORE) private readonly store: TaskChildStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddTaskCommentCommand): Promise<void> {
    const task = await this.tasks.findById(command.taskId);
    if (task === null) {
      throw new NotFoundDomainException('Task not found');
    }
    await this.store.addComment(
      command.taskId,
      command.authorAdminId,
      command.body,
      this.clock.now(),
    );
  }
}
