import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareNote } from '../../domain/care-note.entity';
import { CareNoteRepository } from '../../domain/care-note.repository';
import { TO_DOMAIN_NOTE_CATEGORY, TO_PERSISTENCE_NOTE_CATEGORY } from './note-enum.maps';

/** Prisma backed adapter for the CareNoteRepository port. */
@Injectable()
export class CareNotePrismaRepository implements CareNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(note: CareNote): Promise<void> {
    await this.prisma.careNote.create({
      data: {
        id: note.id,
        careRecipientId: note.careRecipientId,
        category: TO_PERSISTENCE_NOTE_CATEGORY[note.category],
        content: note.content,
        authorName: note.authorName,
        authorRole: note.authorRole,
        attachmentKeys: note.attachmentKeys,
        flaggedForReview: note.flaggedForReview,
        acknowledgedAt: note.acknowledgedAt,
        acknowledgedByAdminId: note.acknowledgedByAdminId,
        authorAdminId: note.authorAdminId,
        postedAt: note.postedAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  }

  async save(note: CareNote): Promise<void> {
    await this.prisma.careNote.update({
      where: { id: note.id },
      data: {
        flaggedForReview: note.flaggedForReview,
        acknowledgedAt: note.acknowledgedAt,
        acknowledgedByAdminId: note.acknowledgedByAdminId,
      },
    });
  }

  async findById(id: string): Promise<CareNote | null> {
    const row = await this.prisma.careNote.findUnique({ where: { id } });
    if (row === null) {
      return null;
    }
    return CareNote.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      category: TO_DOMAIN_NOTE_CATEGORY[row.category],
      content: row.content,
      authorName: row.authorName,
      authorRole: row.authorRole,
      attachmentKeys: row.attachmentKeys,
      flaggedForReview: row.flaggedForReview,
      acknowledgedAt: row.acknowledgedAt,
      acknowledgedByAdminId: row.acknowledgedByAdminId,
      authorAdminId: row.authorAdminId,
      postedAt: row.postedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
