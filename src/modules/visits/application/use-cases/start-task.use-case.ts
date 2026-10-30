import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitTasksResult, toVisitTasksResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface StartTaskCommand {
  caregiverId: string;
  visitId: string;
  taskIndex: number;
}

/**
 * Use case: a caregiver marks a checklist task as started (now working on it), so
 * the admin can see an in progress "Ongoing" state. Tasks are identified by their
 * position in the checklist. Idempotent: a task already started keeps its time.
 */
@Injectable()
export class StartTaskUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: StartTaskCommand): Promise<VisitTasksResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);
    visit.startTask(command.taskIndex, this.clock.now());
    await this.visits.save(visit);
    return toVisitTasksResult(visit);
  }
}
