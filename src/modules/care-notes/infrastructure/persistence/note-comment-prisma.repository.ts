import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { NoteComment } from '../../domain/note-comment.entity';
import { NoteCommentRepository } from '../../domain/note-comment.repository';

/** Prisma backed adapter for the NoteCommentRepository port (append only). */
@Injectable()
export class NoteCommentPrismaRepository implements NoteCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(comment: NoteComment): Promise<void> {
    await this.prisma.noteComment.create({
      data: {
        id: comment.id,
        noteId: comment.noteId,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        content: comment.content,
        createdAt: comment.createdAt,
      },
    });
  }
}
