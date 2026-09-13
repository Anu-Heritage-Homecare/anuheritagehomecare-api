import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_NOTE_REPOSITORY,
  CareNoteRepository,
} from '@modules/care-notes/domain/care-note.repository';
import { NoteComment } from '@modules/care-notes/domain/note-comment.entity';
import {
  NOTE_COMMENT_REPOSITORY,
  NoteCommentRepository,
} from '@modules/care-notes/domain/note-comment.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AddNoteCommentCommand {
  recipientId: string;
  noteId: string;
  authorName: string;
  authorRole?: string | null;
  content: string;
}

/**
 * Use case: append a comment to a care note (a supervisor or colleague reply). The
 * note must belong to the recipient in scope.
 */
@Injectable()
export class AddNoteCommentUseCase {
  constructor(
    @Inject(CARE_NOTE_REPOSITORY) private readonly notes: CareNoteRepository,
    @Inject(NOTE_COMMENT_REPOSITORY) private readonly comments: NoteCommentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddNoteCommentCommand): Promise<{ id: string }> {
    const note = await this.notes.findById(command.noteId);
    if (note === null || note.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Note not found');
    }

    const comment = NoteComment.create({
      id: this.ids.generate(),
      noteId: note.id,
      authorName: command.authorName,
      authorRole: command.authorRole,
      content: command.content,
      now: this.clock.now(),
    });
    await this.comments.add(comment);
    return { id: comment.id };
  }
}
