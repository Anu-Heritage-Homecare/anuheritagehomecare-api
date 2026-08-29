import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  PHOTO_STORAGE,
  PhotoStorage,
  PhotoUploadTicket,
} from '@shared/application/ports/photo-storage.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { loadOwnedVisit } from '../load-owned-visit';

export interface CreatePhotoUploadTicketCommand {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: issue a signed ticket so the caregiver's app can upload a visit photo
 * straight to the object store. The caregiver must own the visit. After the
 * upload succeeds the client persists the returned key through the save photos
 * endpoint.
 */
@Injectable()
export class CreatePhotoUploadTicketUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreatePhotoUploadTicketCommand): Promise<PhotoUploadTicket> {
    await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);
    const reference = `${command.visitId}/${this.ids.generate()}`;
    return this.photoStorage.createUploadTicket({ reference, now: this.clock.now() });
  }
}
