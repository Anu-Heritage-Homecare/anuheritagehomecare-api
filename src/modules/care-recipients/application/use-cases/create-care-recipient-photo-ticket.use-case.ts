import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  PHOTO_STORAGE,
  PhotoStorage,
  PhotoUploadTicket,
} from '@shared/application/ports/photo-storage.port';

export interface CreateCareRecipientPhotoTicketCommand {
  ownerId: string;
}

/**
 * Use case: issue a signed ticket so the family owner's app can upload a loved
 * one's profile photo straight to the object store during onboarding. The raw
 * image never passes through the API. The returned `key` is then passed as
 * `photoKey` when creating or updating the care recipient draft.
 *
 * The reference is namespaced under `care-recipients/photos` and scoped to the
 * owner, distinct from the user's own avatar namespace, so a recipient photo can
 * never be mistaken for (or clobber) the owner's avatar.
 */
@Injectable()
export class CreateCareRecipientPhotoTicketUseCase {
  constructor(
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(command: CreateCareRecipientPhotoTicketCommand): PhotoUploadTicket {
    const reference = `care-recipients/photos/${command.ownerId}/${this.ids.generate()}`;
    return this.photos.createUploadTicket({ reference, now: this.clock.now() });
  }
}
