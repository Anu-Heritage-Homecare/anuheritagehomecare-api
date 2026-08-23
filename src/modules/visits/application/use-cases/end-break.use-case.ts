import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitBreakResult, toVisitBreak } from '../dto/visit-break.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface EndBreakCommand {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: a caregiver ends the open break on their visit. The break's duration
 * is added to the visit's accumulated break time and the visit returns to
 * IN_PROGRESS.
 */
@Injectable()
export class EndBreakUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EndBreakCommand): Promise<VisitBreakResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);
    visit.endBreak(this.clock.now());
    await this.visits.save(visit);
    return toVisitBreak(visit);
  }
}
