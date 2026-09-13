import { Module } from '@nestjs/common';
import { CARE_NOTE_REPOSITORY } from './domain/care-note.repository';
import { NOTE_COMMENT_REPOSITORY } from './domain/note-comment.repository';
import { CareNotePrismaRepository } from './infrastructure/persistence/care-note-prisma.repository';
import { NoteCommentPrismaRepository } from './infrastructure/persistence/note-comment-prisma.repository';

/**
 * Care notes bounded context composition root. Owns the note and comment write side;
 * the admin Notes read model composes these tables. The domain ports are bound to
 * their Prisma adapters here and exported so the admin layer depends only on the
 * abstractions.
 */
@Module({
  providers: [
    { provide: CARE_NOTE_REPOSITORY, useClass: CareNotePrismaRepository },
    { provide: NOTE_COMMENT_REPOSITORY, useClass: NoteCommentPrismaRepository },
  ],
  exports: [CARE_NOTE_REPOSITORY, NOTE_COMMENT_REPOSITORY],
})
export class CareNotesModule {}
