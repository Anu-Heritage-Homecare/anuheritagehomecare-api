import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AnnouncementCounts,
  AnnouncementDetailRow,
  AnnouncementListRead,
  AnnouncementListRow,
  AnnouncementsReadModel,
  AnnouncementTab,
} from '../../application/ports/announcements-read.port';

interface AuthorInfo {
  name: string;
  photoKey: string | null;
}

/** Prisma read model for the announcements screens. */
@Injectable()
export class AnnouncementsReadPrisma implements AnnouncementsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(tab: AnnouncementTab): Promise<AnnouncementListRead> {
    const [counts, rows] = await Promise.all([
      this.counts(),
      this.prisma.announcement.findMany({
        where: { status: tab },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const authors = await this.authors(rows.map((r) => r.authorAdminId));
    return {
      counts,
      rows: rows.map((r) => this.toRow(r, authors.get(r.authorAdminId) ?? null)),
    };
  }

  async getById(id: string): Promise<AnnouncementDetailRow | null> {
    const row = await this.prisma.announcement.findUnique({ where: { id } });
    if (row === null) {
      return null;
    }
    const authors = await this.authors([row.authorAdminId]);
    return { ...this.toRow(row, authors.get(row.authorAdminId) ?? null), body: row.body };
  }

  private toRow(
    row: {
      id: string;
      title: string;
      audiences: string[];
      priority: string;
      status: string;
      scheduledFor: Date | null;
      publishedAt: Date | null;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    author: AuthorInfo | null,
  ): AnnouncementListRow {
    return {
      id: row.id,
      title: row.title,
      audiences: row.audiences.map((a) => String(a)),
      priority: String(row.priority),
      status: String(row.status),
      authorName: author?.name ?? null,
      authorPhotoKey: author?.photoKey ?? null,
      scheduledFor: row.scheduledFor,
      publishedAt: row.publishedAt,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async counts(): Promise<AnnouncementCounts> {
    const grouped = await this.prisma.announcement.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = new Map(grouped.map((g) => [String(g.status), g._count._all]));
    return {
      draft: byStatus.get('DRAFT') ?? 0,
      scheduled: byStatus.get('SCHEDULED') ?? 0,
      published: byStatus.get('PUBLISHED') ?? 0,
      archived: byStatus.get('ARCHIVED') ?? 0,
    };
  }

  private async authors(ids: string[]): Promise<Map<string, AuthorInfo>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const admins = await this.prisma.adminUser.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, photoKey: true },
    });
    return new Map(
      admins.map((a) => [
        a.id,
        { name: `${a.firstName} ${a.lastName}`.trim(), photoKey: a.photoKey },
      ]),
    );
  }
}
