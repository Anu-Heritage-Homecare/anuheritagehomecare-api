import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  PHOTO_STORAGE,
  PhotoStorage,
  PhotoUploadTicket,
} from '@shared/application/ports/photo-storage.port';

/**
 * Use case: issue a signed ticket so the back office can upload a message
 * attachment straight to the object store. After the upload succeeds the client
 * sends the returned key (with the file name and size) on the message. Fails
 * closed through the storage port when the store is not configured.
 */
@Injectable()
export class CreateAttachmentUploadTicketUseCase {
  constructor(
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(adminId: string): PhotoUploadTicket {
    const reference = `messages/${adminId}/${this.ids.generate()}`;
    return this.photoStorage.createUploadTicket({ reference, now: this.clock.now() });
  }
}
