import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ATTACHMENT_REPOSITORY, AttachmentRepository } from '../../domain/attachment.repository';
import { MESSAGING_READ_MODEL, MessagingReadModel } from '../ports/messaging-read.port';

/**
 * Use case: delete an attachment from a conversation in the admin's inbox.
 *
 * shortcut: removes the metadata row only; the blob is not deleted from the object
 * store (the PhotoStorage port has no delete). Add a store delete when provisioned.
 */
@Injectable()
export class DeleteAttachmentUseCase {
  constructor(
    @Inject(MESSAGING_READ_MODEL) private readonly reads: MessagingReadModel,
    @Inject(ATTACHMENT_REPOSITORY) private readonly attachments: AttachmentRepository,
  ) {}

  async execute(adminId: string, attachmentId: string): Promise<void> {
    const row = await this.reads.getAttachment(adminId, attachmentId);
    if (row === null) {
      throw new NotFoundDomainException('Attachment not found');
    }
    await this.attachments.deleteById(attachmentId);
  }
}
