import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { TASK_CHILD_STORE, TaskChildStore } from '../ports/task-child.store';

export interface SetChecklistItemCommand {
  taskId: string;
  itemId: string;
  done: boolean;
}

/** Use case: tick or untick one checklist item on a task. */
@Injectable()
export class SetChecklistItemUseCase {
  constructor(
    @Inject(TASK_CHILD_STORE) private readonly store: TaskChildStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetChecklistItemCommand): Promise<void> {
    const ownerTaskId = await this.store.findChecklistItemTaskId(command.itemId);
    if (ownerTaskId === null || ownerTaskId !== command.taskId) {
      throw new NotFoundDomainException('Checklist item not found on this task');
    }
    await this.store.setChecklistItemDone(command.itemId, command.done, this.clock.now());
  }
}
