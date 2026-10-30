import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ANNOUNCEMENT_REPOSITORY,
  AnnouncementRepository,
} from '../../domain/announcement.repository';

/** Use case: archive an announcement (removes it from the active tabs). */
@Injectable()
export class ArchiveAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<void> {
    const announcement = await this.repository.findById(id);
    if (announcement === null) {
      throw new NotFoundDomainException('Announcement not found');
    }
    announcement.archive(this.clock.now());
    await this.repository.save(announcement);
  }
}
