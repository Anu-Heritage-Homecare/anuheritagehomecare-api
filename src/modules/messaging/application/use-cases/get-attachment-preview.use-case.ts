import { Inject, Injectable } from '@nestjs/common';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AttachmentPreviewResult } from '../dto/attachment-preview.result';
import { dateTimeLabel, fileSizeLabel, humanLabel } from '../messaging.presenter';
import { MESSAGING_READ_MODEL, MessagingReadModel } from '../ports/messaging-read.port';

/** Use case: the File Preview panel for one attachment in the admin's inbox. */
@Injectable()
export class GetAttachmentPreviewUseCase {
  constructor(
    @Inject(MESSAGING_READ_MODEL) private readonly reads: MessagingReadModel,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  async execute(adminId: string, attachmentId: string): Promise<AttachmentPreviewResult> {
    const row = await this.reads.getAttachment(adminId, attachmentId);
    if (row === null) {
      throw new NotFoundDomainException('Attachment not found');
    }
    const role = humanLabel(row.uploaderRole);
    const uploadedByLabel =
      row.uploaderName === null
        ? null
        : role === null
          ? row.uploaderName
          : `${row.uploaderName} (${role})`;

    return {
      id: row.id,
      fileName: row.fileName,
      sizeLabel: fileSizeLabel(row.sizeBytes),
      uploadedByLabel,
      uploadDateLabel: dateTimeLabel(row.createdAt),
      linkedVisitId: row.linkedVisitId,
      linkedVisitReference: row.linkedVisitReference,
      url: this.photoStorage.urlFor(row.storageKey),
    };
  }
}
