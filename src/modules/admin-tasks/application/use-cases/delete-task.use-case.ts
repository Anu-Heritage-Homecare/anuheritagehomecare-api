import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';

/** Use case: delete a task (its checklist and comments cascade in the database). */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
  ) {}

  async execute(taskId: string): Promise<void> {
    const task = await this.tasks.findById(taskId);
    if (task === null) {
      throw new NotFoundDomainException('Task not found');
    }
    await this.tasks.delete(taskId);
  }
}
