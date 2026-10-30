import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Announcement } from '../../domain/announcement.entity';
import { AnnouncementRepository } from '../../domain/announcement.repository';
import { AnnouncementMapper } from './announcement.mapper';

/** Prisma adapter for the AnnouncementRepository port. */
@Injectable()
export class AnnouncementPrismaRepository implements AnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(announcement: Announcement): Promise<void> {
    const row = AnnouncementMapper.toPersistence(announcement);
    await this.prisma.announcement.upsert({
      where: { id: row.id },
      create: row,
      update: {
        title: row.title,
        body: row.body,
        audiences: row.audiences,
        priority: row.priority,
        status: row.status,
        scheduledFor: row.scheduledFor,
        publishedAt: row.publishedAt,
        archivedAt: row.archivedAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Announcement | null> {
    const row = await this.prisma.announcement.findUnique({ where: { id } });
    return row ? AnnouncementMapper.toDomain(row) : null;
  }
}
