import { Announcement as PrismaAnnouncement } from '@prisma/client';
import { AnnouncementAudience } from '../../domain/announcement-audience.enum';
import { AnnouncementPriority } from '../../domain/announcement-priority.enum';
import { AnnouncementStatus } from '../../domain/announcement-status.enum';
import { Announcement } from '../../domain/announcement.entity';

/** Translates between the Prisma announcement row and the aggregate. */
export class AnnouncementMapper {
  static toDomain(row: PrismaAnnouncement): Announcement {
    return Announcement.rehydrate(row.id, {
      title: row.title,
      body: row.body,
      audiences: row.audiences as AnnouncementAudience[],
      priority: row.priority as AnnouncementPriority,
      status: row.status as AnnouncementStatus,
      authorAdminId: row.authorAdminId,
      scheduledFor: row.scheduledFor,
      publishedAt: row.publishedAt,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(announcement: Announcement): PrismaAnnouncement {
    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      audiences: announcement.audiences,
      priority: announcement.priority,
      status: announcement.status,
      authorAdminId: announcement.authorAdminId,
      scheduledFor: announcement.scheduledFor,
      publishedAt: announcement.publishedAt,
      archivedAt: announcement.archivedAt,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }
}
