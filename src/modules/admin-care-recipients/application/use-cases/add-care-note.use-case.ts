import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareNote } from '@modules/care-notes/domain/care-note.entity';
import {
  CARE_NOTE_REPOSITORY,
  CareNoteRepository,
} from '@modules/care-notes/domain/care-note.repository';
import { NoteCategory } from '@modules/care-notes/domain/note-category.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AddCareNoteCommand {
  recipientId: string;
  adminId: string;
  category: NoteCategory;
  content: string;
  authorName: string;
  authorRole?: string | null;
  attachmentKeys?: string[] | null;
  flaggedForReview?: boolean;
  postedAt?: Date | null;
}

/**
 * Use case: the admin logs a care note on a recipient's activity feed (a coordinator
 * entry, a family communication or an incident write up). Attributed to the admin who
 * entered it; the displayed author name and role are carried on the note itself.
 */
@Injectable()
export class AddCareNoteUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_NOTE_REPOSITORY) private readonly notes: CareNoteRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddCareNoteCommand): Promise<{ id: string }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const note = CareNote.post({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      category: command.category,
      content: command.content,
      authorName: command.authorName,
      authorRole: command.authorRole,
      attachmentKeys: command.attachmentKeys,
      flaggedForReview: command.flaggedForReview,
      authorAdminId: command.adminId,
      postedAt: command.postedAt,
      now: this.clock.now(),
    });
    await this.notes.add(note);
    return { id: note.id };
  }
}
