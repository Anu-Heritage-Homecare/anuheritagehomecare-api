import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ANNOUNCEMENT_REPOSITORY,
  AnnouncementRepository,
} from '../../domain/announcement.repository';

/** Use case: duplicate an announcement as a fresh draft authored by the acting admin. */
@Injectable()
export class DuplicateAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(adminId: string, id: string): Promise<{ id: string }> {
    const source = await this.repository.findById(id);
    if (source === null) {
      throw new NotFoundDomainException('Announcement not found');
    }
    const copy = source.duplicateAsDraft(this.ids.generate(), adminId, this.clock.now());
    await this.repository.save(copy);
    return { id: copy.id };
  }
}
