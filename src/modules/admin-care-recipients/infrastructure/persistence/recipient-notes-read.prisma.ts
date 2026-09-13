import { Injectable } from '@nestjs/common';
import { NoteCategory as PrismaCategory, Prisma } from '@prisma/client';
import { NoteCategory } from '@modules/care-notes/domain/note-category.enum';
import {
  TO_DOMAIN_NOTE_CATEGORY,
  TO_PERSISTENCE_NOTE_CATEGORY,
} from '@modules/care-notes/infrastructure/persistence/note-enum.maps';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  NoteCountsView,
  NoteFilter,
  NotePageView,
  NoteRowView,
  RecipientNotesReadModel,
} from '../../application/ports/recipient-notes-read.port';

const AUTHOR_LIMIT = 100;

/** Prisma read model over the care notes tables for the admin Notes screen. */
@Injectable()
export class RecipientNotesReadPrisma implements RecipientNotesReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listPage(filter: NoteFilter): Promise<NotePageView> {
    const where = this.whereForFilter(filter);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.careNote.count({ where }),
      this.prisma.careNote.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        skip: Math.max(0, (filter.page - 1) * filter.pageSize),
        take: filter.pageSize,
        select: {
          id: true,
          category: true,
          content: true,
          authorName: true,
          authorRole: true,
          postedAt: true,
          flaggedForReview: true,
          acknowledgedAt: true,
          attachmentKeys: true,
          _count: { select: { comments: true } },
        },
      }),
    ]);
    return { total, rows: rows.map((row) => this.toRow(row)) };
  }

  async counts(recipientId: string, monthStart: Date): Promise<NoteCountsView> {
    const scoped: Prisma.CareNoteWhereInput = { careRecipientId: recipientId };
    const [total, groups, thisMonth, flaggedForReview] = await Promise.all([
      this.prisma.careNote.count({ where: scoped }),
      this.prisma.careNote.groupBy({
        by: ['category'],
        where: scoped,
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.careNote.count({ where: { ...scoped, postedAt: { gte: monthStart } } }),
      this.prisma.careNote.count({ where: { ...scoped, flaggedForReview: true } }),
    ]);
    const byCategory = new Map<NoteCategory, number>();
    for (const group of groups) {
      byCategory.set(TO_DOMAIN_NOTE_CATEGORY[group.category], group._count._all);
    }
    return { total, byCategory, thisMonth, flaggedForReview };
  }

  async authors(recipientId: string): Promise<string[]> {
    const rows = await this.prisma.careNote.findMany({
      where: { careRecipientId: recipientId },
      distinct: ['authorName'],
      orderBy: { authorName: 'asc' },
      take: AUTHOR_LIMIT,
      select: { authorName: true },
    });
    return rows.map((row) => row.authorName);
  }

  private whereForFilter(filter: NoteFilter): Prisma.CareNoteWhereInput {
    const where: Prisma.CareNoteWhereInput = { careRecipientId: filter.recipientId };
    if (filter.category !== null) {
      where.category = TO_PERSISTENCE_NOTE_CATEGORY[filter.category];
    }
    if (filter.authorName !== null && filter.authorName.trim().length > 0) {
      where.authorName = filter.authorName.trim();
    }
    const search = filter.search?.trim();
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private toRow(row: {
    id: string;
    category: PrismaCategory;
    content: string;
    authorName: string;
    authorRole: string | null;
    postedAt: Date;
    flaggedForReview: boolean;
    acknowledgedAt: Date | null;
    attachmentKeys: string[];
    _count: { comments: number };
  }): NoteRowView {
    return {
      id: row.id,
      category: TO_DOMAIN_NOTE_CATEGORY[row.category],
      content: row.content,
      authorName: row.authorName,
      authorRole: row.authorRole,
      postedAt: row.postedAt,
      flaggedForReview: row.flaggedForReview,
      acknowledgedAt: row.acknowledgedAt,
      commentCount: row._count.comments,
      attachmentCount: row.attachmentKeys.length,
    };
  }
}
