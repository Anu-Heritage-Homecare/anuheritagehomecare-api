import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitTasksResult, toVisitTasksResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface SetTaskCompletionCommand {
  caregiverId: string;
  visitId: string;
  taskIndex: number;
  completed: boolean;
  durationMinutes?: number | null;
}

/**
 * Use case: a caregiver ticks a checklist task complete (or clears it) during
 * their visit. Tasks are identified by their position in the checklist.
 */
@Injectable()
export class SetTaskCompletionUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetTaskCompletionCommand): Promise<VisitTasksResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    visit.setTaskCompletion(
      command.taskIndex,
      command.completed,
      this.clock.now(),
      command.durationMinutes ?? null,
    );
    await this.visits.save(visit);

    return toVisitTasksResult(visit);
  }
}
