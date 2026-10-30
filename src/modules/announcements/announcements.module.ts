import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ANNOUNCEMENTS_READ_MODEL } from './application/ports/announcements-read.port';
import { ArchiveAnnouncementUseCase } from './application/use-cases/archive-announcement.use-case';
import { CreateAnnouncementUseCase } from './application/use-cases/create-announcement.use-case';
import { DuplicateAnnouncementUseCase } from './application/use-cases/duplicate-announcement.use-case';
import { GetAnnouncementUseCase } from './application/use-cases/get-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { PublishAnnouncementUseCase } from './application/use-cases/publish-announcement.use-case';
import { ANNOUNCEMENT_REPOSITORY } from './domain/announcement.repository';
import { AnnouncementPrismaRepository } from './infrastructure/persistence/announcement-prisma.repository';
import { AnnouncementsReadPrisma } from './infrastructure/persistence/announcements-read.prisma';
import { AdminAnnouncementsController } from './presentation/admin-announcements.controller';

/** Announcements bounded context composition root (back office broadcasts). */
@Module({
  imports: [PassportModule],
  controllers: [AdminAnnouncementsController],
  providers: [
    ListAnnouncementsUseCase,
    GetAnnouncementUseCase,
    CreateAnnouncementUseCase,
    DuplicateAnnouncementUseCase,
    PublishAnnouncementUseCase,
    ArchiveAnnouncementUseCase,
    { provide: ANNOUNCEMENT_REPOSITORY, useClass: AnnouncementPrismaRepository },
    { provide: ANNOUNCEMENTS_READ_MODEL, useClass: AnnouncementsReadPrisma },
  ],
})
export class AnnouncementsModule {}
