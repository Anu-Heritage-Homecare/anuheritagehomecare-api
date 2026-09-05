import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  PHOTO_STORAGE,
  PhotoStorage,
  PhotoUploadTicket,
} from '@shared/application/ports/photo-storage.port';

export interface CreateProfilePhotoTicketCommand {
  userId: string;
}

/**
 * Use case: issue a signed ticket so the app can upload a new profile photo
 * straight to the object store. The raw image never passes through the API. After
 * the upload succeeds the client persists the returned key through the set photo
 * endpoint.
 */
@Injectable()
export class CreateProfilePhotoTicketUseCase {
  constructor(
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: CreateProfilePhotoTicketCommand): PhotoUploadTicket {
    const reference = `avatars/${command.userId}/${this.ids.generate()}`;
    return this.photos.createUploadTicket({ reference, now: this.clock.now() });
  }
}
