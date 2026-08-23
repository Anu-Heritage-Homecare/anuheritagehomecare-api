import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitBreakResult, toVisitBreak } from '../dto/visit-break.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface StartBreakCommand {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: a caregiver starts a break during their visit. The visit must be
 * theirs and under way; it moves to ON_BREAK, which pauses the other recording
 * actions until the break ends.
 */
@Injectable()
export class StartBreakUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: StartBreakCommand): Promise<VisitBreakResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);
    visit.startBreak(this.clock.now());
    await this.visits.save(visit);
    return toVisitBreak(visit);
  }
}
