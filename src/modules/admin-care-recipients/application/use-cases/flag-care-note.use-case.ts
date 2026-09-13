import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_NOTE_REPOSITORY,
  CareNoteRepository,
} from '@modules/care-notes/domain/care-note.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface FlagCareNoteCommand {
  recipientId: string;
  noteId: string;
  flagged: boolean;
}

/**
 * Use case: flag a care note for urgent supervisor attention, or clear the flag once
 * it has been actioned.
 */
@Injectable()
export class FlagCareNoteUseCase {
  constructor(
    @Inject(CARE_NOTE_REPOSITORY) private readonly notes: CareNoteRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: FlagCareNoteCommand): Promise<{ id: string; flaggedForReview: boolean }> {
    const note = await this.notes.findById(command.noteId);
    if (note === null || note.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Note not found');
    }
    note.setFlagged(command.flagged, this.clock.now());
    await this.notes.save(note);
    return { id: note.id, flaggedForReview: note.flaggedForReview };
  }
}
