import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitNotesResult, toVisitNotesResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface SaveVisitNotesCommand {
  caregiverId: string;
  visitId: string;
  visitNote?: string | null;
  familyNote?: string | null;
  photoKeys?: string[];
}

/**
 * Use case: a caregiver saves the visit note and the optional family note, plus
 * any attached photo keys. The whole notes section is replaced on each save.
 */
@Injectable()
export class SaveVisitNotesUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SaveVisitNotesCommand): Promise<VisitNotesResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    visit.saveNotes({
      visitNote: command.visitNote,
      familyNote: command.familyNote,
      photoKeys: command.photoKeys,
      now: this.clock.now(),
    });
    await this.visits.save(visit);

    return toVisitNotesResult(visit);
  }
}
