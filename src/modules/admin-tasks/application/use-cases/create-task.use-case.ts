import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { OperationalTask } from '../../domain/operational-task.entity';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskResult, toTaskResult } from '../dto/task.result';

export interface CreateTaskCommand {
  createdByAdminId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignedToAdminId?: string | null;
  relatedCareRecipientId?: string | null;
  dueAt?: Date | null;
}

/** Use case: a coordinator creates a new operational task. */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateTaskCommand): Promise<TaskResult> {
    const task = OperationalTask.create({
      id: this.ids.generate(),
      title: command.title,
      description: command.description,
      priority: command.priority,
      assignedToAdminId: command.assignedToAdminId,
      createdByAdminId: command.createdByAdminId,
      relatedCareRecipientId: command.relatedCareRecipientId,
      dueAt: command.dueAt,
      now: this.clock.now(),
    });
    await this.tasks.save(task);
    return toTaskResult(task);
  }
}
