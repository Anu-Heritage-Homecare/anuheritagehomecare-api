import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { OperationalTask } from '../../domain/operational-task.entity';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskCategory } from '../../domain/task-category.enum';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskResult, toTaskResult } from '../dto/task.result';
import { TASK_CHILD_STORE, TaskChildStore } from '../ports/task-child.store';

export interface CreateTaskCommand {
  createdByAdminId: string;
  title: string;
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
  checklistItems?: string[];
}

/** Use case: a coordinator creates a new operational task. */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(TASK_CHILD_STORE) private readonly childStore: TaskChildStore,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateTaskCommand): Promise<TaskResult> {
    const now = this.clock.now();
    const task = OperationalTask.create({
      id: this.ids.generate(),
      title: command.title,
      description: command.description,
      priority: command.priority,
      category: command.category,
      assignedToAdminId: command.assignedToAdminId,
      assigneeLabel: command.assigneeLabel,
      createdByAdminId: command.createdByAdminId,
      relatedCareRecipientId: command.relatedCareRecipientId,
      relatedVisitId: command.relatedVisitId,
      dueAt: command.dueAt,
      recurrenceLabel: command.recurrenceLabel,
      estimatedMinutes: command.estimatedMinutes,
      now,
    });
    await this.tasks.save(task);

    const labels = (command.checklistItems ?? [])
      .map((label) => label.trim())
      .filter((label) => label.length > 0);
    if (labels.length > 0) {
      await this.childStore.createChecklistItems(task.id, labels, now);
    }
    return toTaskResult(task);
  }
}
