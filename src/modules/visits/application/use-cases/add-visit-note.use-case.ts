import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NoteAudience } from '../../domain/note-audience.enum';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitNotesResult, toVisitNotesResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface AddVisitNoteCommand {
  caregiverId: string;
  visitId: string;
  audience: NoteAudience;
  text: string;
}

/**
 * Use case: a caregiver appends a note to a visit's notes feed during their
 * shift. The author is the authenticated caregiver and the time is stamped server
 * side. Returns the whole feed, oldest first.
 */
@Injectable()
export class AddVisitNoteUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddVisitNoteCommand): Promise<VisitNotesResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    visit.addNote({
      authorId: command.caregiverId,
      audience: command.audience,
      text: command.text,
      now: this.clock.now(),
    });
    await this.visits.save(visit);

    return toVisitNotesResult(visit);
  }
}
