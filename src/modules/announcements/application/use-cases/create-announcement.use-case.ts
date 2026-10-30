import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { AnnouncementAudience } from '../../domain/announcement-audience.enum';
import { AnnouncementPriority } from '../../domain/announcement-priority.enum';
import { Announcement } from '../../domain/announcement.entity';
import {
  ANNOUNCEMENT_REPOSITORY,
  AnnouncementRepository,
} from '../../domain/announcement.repository';

export type CreateAnnouncementAction = 'DRAFT' | 'SCHEDULE' | 'PUBLISH';

export interface CreateAnnouncementCommand {
  authorAdminId: string;
  title: string;
  body: string;
  audiences: AnnouncementAudience[];
  priority?: AnnouncementPriority;
  action: CreateAnnouncementAction;
  scheduledFor: Date | null;
}

/** Use case: author an announcement and optionally schedule or publish it now. */
@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateAnnouncementCommand): Promise<{ id: string }> {
    const now = this.clock.now();
    const announcement = Announcement.create({
      id: this.ids.generate(),
      title: command.title,
      body: command.body,
      audiences: command.audiences,
      priority: command.priority,
      authorAdminId: command.authorAdminId,
      now,
    });

    if (command.action === 'SCHEDULE') {
      if (command.scheduledFor === null) {
        throw new ValidationException('A scheduled announcement needs a scheduled time');
      }
      announcement.schedule(command.scheduledFor, now);
    } else if (command.action === 'PUBLISH') {
      announcement.publish(now);
    }

    await this.repository.save(announcement);
    return { id: announcement.id };
  }
}
