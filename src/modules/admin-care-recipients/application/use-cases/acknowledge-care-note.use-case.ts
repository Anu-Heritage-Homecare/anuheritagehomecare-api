import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_NOTE_REPOSITORY,
  CareNoteRepository,
} from '@modules/care-notes/domain/care-note.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AcknowledgeCareNoteCommand {
  recipientId: string;
  noteId: string;
  adminId: string;
}

/**
 * Use case: a supervisor acknowledges a care note, recording that it was reviewed.
 * The first acknowledgement stands; re-acknowledging is a no op.
 */
@Injectable()
export class AcknowledgeCareNoteUseCase {
  constructor(
    @Inject(CARE_NOTE_REPOSITORY) private readonly notes: CareNoteRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: AcknowledgeCareNoteCommand,
  ): Promise<{ id: string; acknowledged: boolean }> {
    const note = await this.notes.findById(command.noteId);
    if (note === null || note.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Note not found');
    }
    note.acknowledge(command.adminId, this.clock.now());
    await this.notes.save(note);
    return { id: note.id, acknowledged: note.acknowledgedAt !== null };
  }
}
